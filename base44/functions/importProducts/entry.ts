import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { rows, categories } = await req.json();

    // Group rows by SKU — the export format puts product info on the first row
    // and subsequent rows only have combo/variant data with empty product fields.
    // We need to carry forward the last seen SKU for rows without one.
    const skuMap = {};
    let lastSku = null;

    for (const row of rows) {
      const sku = row.sku || row.SKU || lastSku;
      if (!sku) continue;
      lastSku = sku;

      if (!skuMap[sku]) {
        skuMap[sku] = {
          sku,
          name: row.name || row.Name || '',
          price: row.price != null ? parseFloat(row.price) : undefined,
          compare_at_price: row.compare_at_price != null ? parseFloat(row.compare_at_price) : undefined,
          description: row.description || row.Description || '',
          short_description: row.short_description || '',
          category_name: row.category_name || row.Category || '',
          stock_quantity: row.stock_quantity != null ? parseInt(row.stock_quantity) : undefined,
          is_active: row.is_active === false || row.is_active === 'false' ? false : true,
          is_featured: row.is_featured === true || row.is_featured === 'true' ? true : false,
          is_on_sale: row.is_on_sale === true || row.is_on_sale === 'true' ? true : false,
          tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          images: row.images ? row.images.split(',').map(i => i.trim()).filter(Boolean) : [],
          combinations: []
        };
      } else if (row.name) {
        // Update product-level fields if present on a subsequent row
        const entry = skuMap[sku];
        if (row.name) entry.name = row.name;
        if (row.price != null) entry.price = parseFloat(row.price);
        if (row.category_name) entry.category_name = row.category_name;
        if (row.tags) entry.tags = row.tags.split(',').map(t => t.trim()).filter(Boolean);
        if (row.images) entry.images = row.images.split(',').map(i => i.trim()).filter(Boolean);
      }

      const entry = skuMap[sku];

      // Handle combo-style variants (new export format)
      if (row.combo && row.combo_attributes) {
        let attributes = {};
        try {
          attributes = typeof row.combo_attributes === 'string'
            ? JSON.parse(row.combo_attributes)
            : row.combo_attributes;
        } catch (_) {
          attributes = {};
        }
        entry.combinations.push({
          combo: row.combo,
          attributes,
          price: row.combo_price != null ? parseFloat(row.combo_price) : '',
          sku: row.combo_sku || ''
        });
      }
    }

    // Build final product records and upsert
    const results = { created: 0, updated: 0, errors: [] };

    for (const [sku, entry] of Object.entries(skuMap)) {
      try {
        if (!entry.name) {
          results.errors.push({ sku, error: 'Missing product name' });
          continue;
        }

        // Match category
        const cat = categories.find(c => c.name.toLowerCase() === (entry.category_name || '').toLowerCase());

        // Build slug from name
        const slug = entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

        const productData = {
          name: entry.name,
          slug,
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
          variants: entry.combinations
        };

        if (entry.compare_at_price != null) productData.compare_at_price = entry.compare_at_price;

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