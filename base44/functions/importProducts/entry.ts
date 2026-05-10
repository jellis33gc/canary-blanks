import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    let rows = [];
    let categories = body.categories || [];

    if (body.fileBase64) {
      // Decode base64 and parse file
      const binaryString = atob(body.fileBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const workbook = XLSX.read(bytes, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else {
      // Legacy: rows already extracted
      rows = body.rows || [];
    }

    // Group rows by SKU — the export format puts product info on the first row
    // and subsequent rows only have combo/variant data with empty product fields.
    const skuMap = {};
    let lastSku = null;

    for (const row of rows) {
      const sku = String(row.sku || row.SKU || '').trim() || lastSku;
      if (!sku) continue;
      lastSku = sku;

      if (!skuMap[sku]) {
        skuMap[sku] = {
          sku,
          name: String(row.name || row.Name || '').trim(),
          price: row.price !== '' && row.price != null ? parseFloat(row.price) : undefined,
          compare_at_price: row.compare_at_price !== '' && row.compare_at_price != null ? parseFloat(row.compare_at_price) : undefined,
          description: String(row.description || row.Description || '').trim(),
          short_description: String(row.short_description || '').trim(),
          category_name: String(row.category_name || row.Category || '').trim(),
          stock_quantity: row.stock_quantity !== '' && row.stock_quantity != null ? parseInt(row.stock_quantity) : undefined,
          is_active: row.is_active === false || String(row.is_active).toLowerCase() === 'false' ? false : true,
          is_featured: row.is_featured === true || String(row.is_featured).toLowerCase() === 'true' ? true : false,
          is_on_sale: row.is_on_sale === true || String(row.is_on_sale).toLowerCase() === 'true' ? true : false,
          tags: row.tags ? String(row.tags).split(',').map(t => t.trim()).filter(Boolean) : [],
          images: row.images ? String(row.images).split(',').map(i => i.trim()).filter(Boolean) : [],
          combinations: []
        };
      } else if (row.name) {
        const entry = skuMap[sku];
        if (row.name) entry.name = String(row.name).trim();
        if (row.price !== '' && row.price != null) entry.price = parseFloat(row.price);
        if (row.category_name) entry.category_name = String(row.category_name).trim();
        if (row.tags) entry.tags = String(row.tags).split(',').map(t => t.trim()).filter(Boolean);
        if (row.images) entry.images = String(row.images).split(',').map(i => i.trim()).filter(Boolean);
      }

      const entry = skuMap[sku];

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
          combo: String(row.combo).trim(),
          attributes,
          price: row.combo_price !== '' && row.combo_price != null ? parseFloat(row.combo_price) : '',
          sku: String(row.combo_sku || '').trim()
        });
      }
    }

    const results = { created: 0, updated: 0, errors: [] };

    for (const [sku, entry] of Object.entries(skuMap)) {
      try {
        if (!entry.name) {
          results.errors.push({ sku, error: 'Missing product name' });
          continue;
        }

        const cat = categories.find(c => c.name.toLowerCase() === (entry.category_name || '').toLowerCase());
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