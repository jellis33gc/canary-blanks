import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// This function does a FULL replace of the product including variants.
// We use the service role so the entire document is replaced, not merged.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { productId, data } = await req.json();
    if (!data) return Response.json({ error: 'Missing data' }, { status: 400 });

    let result;
    if (productId) {
      // STEP 1: wipe variants to empty so the DB cannot merge old ones
      await base44.asServiceRole.entities.Product.update(productId, { variants: [] });
      // STEP 2: write full data including correct variants
      result = await base44.asServiceRole.entities.Product.update(productId, data);
    } else {
      result = await base44.asServiceRole.entities.Product.create(data);
    }

    return Response.json({ success: true, product: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});