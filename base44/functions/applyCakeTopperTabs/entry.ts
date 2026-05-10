import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all categories
    const categories = await base44.asServiceRole.entities.Category.list('name', 500);
    
    // Find all cake topper categories (top level and subcategories)
    const cakeTopperCats = categories.filter(c => 
      c.name.toLowerCase().includes('cake topper') || 
      c.name.toLowerCase().includes('topper')
    );

    const cakeTopperCatIds = cakeTopperCats.map(c => c.id);

    // Get all products in those categories
    const allProducts = await base44.asServiceRole.entities.Product.list('name', 1000);
    const cakeTopperProducts = allProducts.filter(p => 
      cakeTopperCatIds.includes(p.category_id)
    );

    const careTab = {
      title: "Care Instructions",
      content: "All of our Cake Toppers are created using food safe PLA and are designed to be one time use only.\n\nIf you want to keep them as a reminder, please wash thoroughly using warm soapy water and then dry thoroughly before storing."
    };

    let updated = 0;

    for (const product of cakeTopperProducts) {
      const existingTabs = product.tabs || [];
      const hasCareTabs = existingTabs.some(t => t.title === "Care Instructions");
      
      if (!hasCareTabs) {
        const newTabs = [...existingTabs, careTab];
        await base44.asServiceRole.entities.Product.update(product.id, { tabs: newTabs });
        updated++;
      }
    }

    return Response.json({ 
      success: true, 
      message: `Applied Care Instructions tab to ${updated} cake topper products`,
      categories: cakeTopperCats.length,
      products: cakeTopperProducts.length,
      updated
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});