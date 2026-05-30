import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { productId, data } = await req.json();
    if (!data) return Response.json({ error: 'Missing data' }, { status: 400 });

    let result;
    if (productId) {
      // Wipe variants first to prevent platform merging old corrupted entries
      await base44.asServiceRole.entities.Product.update(productId, { variants: [] });
      result = await base44.asServiceRole.entities.Product.update(productId, data);
    } else {
      result = await base44.asServiceRole.entities.Product.create(data);
    }

    return Response.json({ success: true, product: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});