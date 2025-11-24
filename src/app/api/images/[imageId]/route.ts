import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db';

/**
 * GET /api/images/[imageId]
 * Fetches image data by imageId and returns it as a PNG image
 * Used to serve generated images from the database
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { imageId } = await params;

    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }

    // Fetch image from database (works with both Supabase and local SQLite)
    const { data: imageData, error } = await db.getImage(imageId);

    if (error || !imageData) {
      console.error('[GET /api/images/[imageId]] Image not found:', error);
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Parse image data if it's stored as a string (SQLite stores as TEXT)
    let base64ImageData = imageData.imageData || (imageData as any).image_data;

    if (!base64ImageData) {
      console.error('[GET /api/images/[imageId]] No image data found');
      return NextResponse.json(
        { error: 'No image data available' },
        { status: 404 }
      );
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64ImageData, 'base64');

    // Return image as PNG
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'Content-Disposition': `inline; filename="${imageData.title || 'generated-image'}.png"`,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/images/[imageId]] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

