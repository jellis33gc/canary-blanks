import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { rows, categories } = await req.json();

    // Group rows by SKU
    const skuMap = {};
    for (const row of rows) {
      const sku = row.sku || row.SKU;
      if (!sku) continue;

      if (!skuMap[sku]) {
        skuMap[sku] = {
          sku,
          name: row.name || row.Name,
          price: parseFloat(row.price || row.Price || 0),
          compare_at_price: row.compare_at_price ? parseFloat(row.compare_at_price) : undefined,
          description: row.description || row.Description || '',
          short_description: row.short_description || '',
          category_name: row.category_name || row.Category || '',
          stock_quantity: row.stock_quantity != null ? parseInt(row.stock_quantity) : undefined,
          is_active: row.is_active === false || row.is_active === 'false' ? false : true,
          is_featured: row.is_featured === true || row.is_featured === 'true' ? true : false,
          is_on_sale: row.is_on_sale === true || row.is_on_sale === 'true' ? true : false,
          tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          images: row.images ? row.images.split(',').map(i => i.trim()).filter(Boolean) : [],
          variantMap: {}
        };
      }

      const entry = skuMap[sku];

      // Process up to 5 variant type columns
      for (let i = 1; i <= 5; i++) {
        const typKey = `variant_type_${i}`;
        const optKey = `variant_option_${i}`;
        const modKey = `variant_modifier_${i}`;

        const variantType = row[typKey];
        const variantOption = row[optKey];
        const variantModifier = row[modKey] != null ? parseFloat(row[modKey]) : 0;

        if (variantType && variantOption) {
          if (!entry.variantMap[variantType]) {
            entry.variantMap[variantType] = {};
          }
          entry.variantMap[variantType][variantOption] = variantModifier;
        }
      }
    }

    // Build final product records and upsert
    const results = { created: 0, updated: 0, errors: [] };

    for (const [sku, entry] of Object.entries(skuMap)) {
      try {
        // Build variants array from variantMap
        const variants = Object.entries(entry.variantMap).map(([name, opts]) => ({
          name,
          options: Object.entries(opts).map(([label, price_modifier]) => ({ label, price_modifier }))
        }));

        // Match category
        const cat = categories.find(c => c.name.toLowerCase() === (entry.category_name || '').toLowerCase());

        const productData = {
          name: entry.name,
          sku: entry.sku,
          price: entry.price,
          description: entry.description,
          short_description: entry.short_description,
          category_id: cat?.id,
          category_name: cat?.name || entry.category_name,
          stock_quantity: entry.stock_quantity,
          is_active: entry.is_active,
          is_featured: entry.is_featured,
          is_on_sale: entry.is_on_sale,
          tags: entry.tags,
          images: entry.images,
          variants
        };

        if (entry.compare_at_price) productData.compare_at_price = entry.compare_at_price;

        // Check if product with this SKU already exists
        const existing = await base44.asServiceRole.entities.Product.filter({ sku });
        if (existing.length > 0) {
          await base44.asServiceRole.entities.Product.update(existing[0].id, productData);
          results.updated++;
        } else {
          await base44.asServiceRole.entities.Product.create(productData);
          results.created++;
        }
      } catch (err) {
        results.errors.push({ sku, error: err.message });
      }
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});