import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const body = await req.json().catch(() => ({}));
    const category = body.data || body;
    const categoryId = body.event?.entity_id || category?.id;

    if (!categoryId) {
      return Response.json({ error: 'No category ID provided' }, { status: 400 });
    }

    // If an image was already uploaded, nothing to do
    if (category.image && String(category.image).trim()) {
      return Response.json({ success: true, skipped: true, message: 'Category already has an image' });
    }

    const categoryName = String(category.name || '').trim();
    if (!categoryName) {
      return Response.json({ error: 'Category name is required to generate an image' }, { status: 400 });
    }

    const categoryDescription = category.description ? String(category.description).trim() : '';

    // Build a prompt that produces a clean, relevant e-commerce category image
    const prompt = [
      `Professional e-commerce product photography for a cake decorating and party supplies shop.`,
      `Category: "${categoryName}".`,
      categoryDescription ? `Context: ${categoryDescription}.` : '',
      `Show relevant items beautifully arranged — bright, clean, appetising, soft neutral background, high quality, square composition.`,
    ].filter(Boolean).join(' ');

    const result = await base44.asServiceRole.integrations.Core.GenerateImage({ prompt });
    const imageUrl = result?.url || result?.file_url;

    if (!imageUrl) {
      return Response.json({ error: 'Image generation returned no URL' }, { status: 500 });
    }

    await db.Category.update(categoryId, { image: imageUrl });

    return Response.json({ success: true, message: 'Category image generated', image: imageUrl });
  } catch (error) {
    console.error('generateCategoryImage error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});