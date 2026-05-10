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
    
    // Recursively find all descendants of a category
    const getDescendants = (catId) => {
      const children = categories.filter(c => c.parent_id === catId);
      const allDesc = [...children];
      children.forEach(child => {
        allDesc.push(...getDescendants(child.id));
      });
      return allDesc;
    };
    
    // Find Cake Toppers category and all its descendants
    const cakeToppersCat = categories.find(c => c.name.toLowerCase() === 'cake toppers');
    if (!cakeToppersCat) {
      return Response.json({ error: 'Cake Toppers category not found' }, { status: 404 });
    }
    
    const allDescendants = getDescendants(cakeToppersCat.id);
    const cakeTopperCatIds = [cakeToppersCat.id, ...allDescendants.map(c => c.id)];
    const cakeTopperCats = [cakeToppersCat, ...allDescendants];

    // Get all products in those categories
    const allProducts = await base44.asServiceRole.entities.Product.list('name', 1000);
    const cakeTopperProducts = allProducts.filter(p => 
      cakeTopperCatIds.includes(p.category_id)
    );

    const careTab = {
      title: "Care Instructions",
      content: "All of our Cake Toppers are created using food safe PLA and are designed to be one time use only.\n\nIf you want to keep them as a reminder, please wash thoroughly using warm soapy water and then dry thoroughly before storing."
    };

    const sizeTab = {
      title: "Cake Topper Size Selection",
      content: "We have a range of sizes available to suit all sizes of cakes.\n\nSmall - For cakes up to 4\" in diameter \nMedium - For cakes up to 6\" in diameter \nLarge - For cakes up to 8\" in diameter \n\nIf you have any doubts, please get in touch and we will be more than happy to help you choose the right size for your needs."
    };

    const updatesToMake = [];
    
    for (const product of cakeTopperProducts) {
      const existingTabs = product.tabs || [];
      const hasCareTab = existingTabs.some(t => t.title === "Care Instructions");
      const hasSizeTab = existingTabs.some(t => t.title === "Cake Topper Size Selection");
      
      let newTabs = existingTabs;
      if (!hasCareTab) newTabs = [...newTabs, careTab];
      if (!hasSizeTab) newTabs = [...newTabs, sizeTab];
      
      if (newTabs.length > existingTabs.length) {
        updatesToMake.push({ id: product.id, tabs: newTabs });
      }
    }

    let updated = 0;
    // Process in batches of 5 with longer delays
    for (let i = 0; i < updatesToMake.length; i += 5) {
      const batch = updatesToMake.slice(i, i + 5);
      await Promise.all(batch.map(u => 
        base44.asServiceRole.entities.Product.update(u.id, { tabs: u.tabs })
      ));
      updated += batch.length;
      // Delay between batches
      if (i + 5 < updatesToMake.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
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