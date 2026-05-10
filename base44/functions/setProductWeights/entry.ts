import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all products
    const allProducts = await base44.asServiceRole.entities.Product.list('', 500);
    
    let updated = 0;
    for (let i = 0; i < allProducts.length; i++) {
      const product = allProducts[i];
      const category = product.category_name?.toLowerCase() || '';
      const isCake = category === 'cake' || category === 'cakes';
      
      // Only update non-cake products without weight
      if (!isCake && !product.weight) {
        await base44.asServiceRole.entities.Product.update(product.id, { weight: 250 });
        updated++;
      }
      
      // Rate limiting: add delay between updates
      if (i < allProducts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return Response.json({ 
      message: `Updated ${updated} non-cake products with 250g weight`,
      updated 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});