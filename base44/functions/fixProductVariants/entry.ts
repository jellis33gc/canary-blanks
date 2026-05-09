import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { productId } = await req.json();

    if (!productId) {
      return Response.json({ error: 'Missing productId' }, { status: 400 });
    }

    // Fetch the product
    const product = await base44.asServiceRole.entities.Product.get(productId);

    if (!product) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if variants need fixing (have combo but no attributes)
    const needsFixing = product.variants?.some(v => v.combo && !v.attributes);

    if (!needsFixing) {
      return Response.json({ message: 'Product variants already have attributes field', product });
    }

    // Extract attribute names from existing variants
    const attributeNames = new Set();
    product.variants?.forEach(v => {
      if (v.combo) {
        const parts = v.combo.split(" / ");
        if (parts.length > 1) {
          // Infer attribute names: first variant determines the structure
          product.variants?.forEach((variant, idx) => {
            if (variant.combo && !attributeNames.size) {
              const comboLen = variant.combo.split(" / ").length;
              for (let i = 0; i < comboLen; i++) {
                attributeNames.add(`Attribute${i + 1}`);
              }
            }
          });
        }
      }
    });

    // Reconstruct variants with attributes
    const updatedVariants = product.variants?.map(v => {
      if (v.combo && !v.attributes) {
        const comboParts = v.combo.split(" / ");
        const attrMap = {};
        let idx = 0;
        attributeNames.forEach(name => {
          attrMap[name] = comboParts[idx] || '';
          idx++;
        });
        return { ...v, attributes: attrMap };
      }
      return v;
    });

    // Update the product
    await base44.asServiceRole.entities.Product.update(productId, { variants: updatedVariants });

    return Response.json({ message: 'Product variants updated successfully', updated: updatedVariants.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});