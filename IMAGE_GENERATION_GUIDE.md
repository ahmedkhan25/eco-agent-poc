# Image Generation Tool Guide

## Overview

The Eco Agent now includes an AI-powered image generation tool that uses OpenAI's GPT Image API (`gpt-image-1`) to create custom infographics, flyers, posters, and visual content on demand.

## Features

- **High-quality image generation** using OpenAI's latest GPT Image model
- **Multiple size options**: Square (1024×1024), Portrait (1024×1536), Landscape (1536×1024)
- **Quality settings**: Low (fast), Medium (balanced), High (best quality)
- **Transparent backgrounds** for logos and graphics
- **Automatic storage** in database (both Supabase and local SQLite)
- **Usage tracking** for pay-per-use billing via Polar
- **Permanent URLs** for generated images

## How to Use

### From the Chat Interface

Simply ask the Eco Agent to create an image. Examples:

```
Create an infographic about Olympia's climate action plan with green and blue colors
```

```
Design a flyer for a community tree planting event with nature-inspired colors
```

```
Generate a diagram showing the water cycle in an urban environment
```

### Tool Parameters

The tool accepts the following parameters:

- **prompt** (required): Detailed description of the image to generate
- **size** (optional): Image dimensions
  - `1024x1024` - Square (default)
  - `1024x1536` - Portrait
  - `1536x1024` - Landscape
- **quality** (optional): Rendering quality
  - `low` - Fastest generation
  - `medium` - Balanced (default)
  - `high` - Best quality
- **background** (optional): Background type
  - `opaque` - Solid background (default)
  - `transparent` - For logos and graphics (PNG only)
- **title** (optional): Title/description for metadata and filename

## Implementation Details

### Architecture

```
User Request
    ↓
Chat Interface → tools.ts (generateImage)
    ↓
OpenAI Image API (gpt-image-1)
    ↓
Database Storage (images table)
    ↓
API Endpoint (/api/images/[imageId])
    ↓
Display in Chat (base64 or URL)
```

### Files Added/Modified

1. **src/lib/tools.ts**
   - Added `generateImage` tool to `healthcareTools` object
   - Handles OpenAI API calls, database storage, and usage tracking

2. **src/lib/db.ts**
   - Added `createImage()` function
   - Added `getImage()` function
   - Supports both Supabase (production) and SQLite (development)

3. **src/lib/local-db/schema.ts**
   - Added `images` table schema for local development
   - Mirrors Supabase images table structure

4. **src/app/api/images/[imageId]/route.ts**
   - New API endpoint to serve generated images
   - Returns PNG with proper caching headers
   - Supports both authenticated and anonymous users

5. **src/lib/polar-events.ts**
   - Added `trackImageGeneration()` method
   - Tracks usage for pay-per-use billing
   - Applies 20% markup to OpenAI costs

## Database Schema

### Supabase Table (Production)

```sql
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id TEXT,
  session_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  revised_prompt TEXT,
  size TEXT NOT NULL,
  quality TEXT NOT NULL,
  background TEXT NOT NULL,
  title TEXT,
  image_data TEXT NOT NULL, -- Base64 encoded PNG
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_images_user_id ON images(user_id);
CREATE INDEX idx_images_session_id ON images(session_id);
CREATE INDEX idx_images_created_at ON images(created_at DESC);
```

### SQLite Schema (Development)

Automatically created via Drizzle ORM schema in `src/lib/local-db/schema.ts`.

## Cost Structure

### OpenAI Image Costs

| Quality | Square (1024×1024) | Portrait (1024×1536) | Landscape (1536×1024) |
|---------|-------------------|---------------------|---------------------|
| Low     | 272 tokens (~$0.005) | 408 tokens (~$0.008) | 400 tokens (~$0.008) |
| Medium  | 1056 tokens (~$0.021) | 1584 tokens (~$0.032) | 1568 tokens (~$0.031) |
| High    | 4160 tokens (~$0.083) | 6240 tokens (~$0.125) | 6208 tokens (~$0.124) |

*Costs are approximate and based on GPT Image token pricing (~$0.02 per 1000 tokens)*

### User Pricing (20% Markup Applied)

- **Low Quality**: ~$0.006-$0.010 per image
- **Medium Quality**: ~$0.025-$0.038 per image
- **High Quality**: ~$0.100-$0.150 per image

Pay-per-use users are charged via Polar billing.

## Environment Variables Required

```bash
# OpenAI API Key (required)
OPENAI_API_KEY=sk-...

# For production billing (optional, only needed for pay-per-use)
POLAR_ACCESS_TOKEN=polar_...

# App mode
NEXT_PUBLIC_APP_MODE=development  # or "production"
```

## Usage Examples

### Basic Image Generation

```typescript
// In chat interface, user types:
"Generate a simple bar chart showing renewable energy adoption"
```

### High-Quality Infographic

```typescript
// In chat interface, user types:
"Create a high-quality infographic about Seattle's urban forestry program with detailed statistics and green color scheme"
```

### Transparent Logo

```typescript
// In chat interface, user types:
"Design a transparent logo for Olympia Climate Action with a tree and mountain silhouette"
```

## API Response Format

The tool returns the following structure:

```json
{
  "success": true,
  "imageId": "550e8400-e29b-41d4-a716-446655440000",
  "imageUrl": "/api/images/550e8400-e29b-41d4-a716-446655440000",
  "imageData": "iVBORw0KGgoAAAANSUhEUgAA...", // Base64 PNG
  "prompt": "Original user prompt",
  "revisedPrompt": "OpenAI's optimized prompt",
  "size": "1024x1024",
  "quality": "medium",
  "background": "opaque",
  "title": "Generated Image",
  "executionTime": 8542
}
```

## Display in Chat

Generated images are automatically displayed in the chat interface using either:

1. **Direct base64 embedding** - For immediate display
2. **Image URL** - For persistent access via `/api/images/[imageId]`

## Limitations

### GPT Image Model Limitations

- **Latency**: Complex prompts may take up to 2 minutes
- **Text Rendering**: May struggle with precise text placement
- **Consistency**: May have difficulty maintaining visual consistency across multiple generations
- **Composition**: May struggle with precise element placement in complex layouts

### Content Moderation

All prompts and generated images are filtered according to OpenAI's [content policy](https://openai.com/policies/usage-policies/).

## Testing

### Development Mode

In development mode (`NEXT_PUBLIC_APP_MODE=development`):
- No billing/tracking occurs
- Images saved to local SQLite database
- Can test without production credentials

### Production Mode

In production mode:
- Requires valid OpenAI API key
- Tracks usage via Polar Events
- Saves to Supabase database
- Applies billing for pay-per-use users

## Troubleshooting

### "OpenAI API key is not configured"

**Solution**: Set `OPENAI_API_KEY` environment variable

```bash
export OPENAI_API_KEY=sk-your-key-here
```

### "Image generation failed"

**Possible causes**:
1. Rate limiting from OpenAI
2. Content policy violation
3. Invalid prompt
4. API key expired/invalid

**Solution**: Check console logs for specific error message

### Image not displaying

**Possible causes**:
1. Image ID not saved to database
2. API endpoint not accessible
3. Base64 data corrupted

**Solution**: Check browser console and network tab for errors

## Future Enhancements

Potential improvements:

1. **Image Editing**: Implement mask-based editing for iterative refinement
2. **Batch Generation**: Create multiple variations in one request
3. **Style Presets**: Predefined styles for common use cases
4. **Image History**: Gallery view of previously generated images
5. **Download Options**: Multiple format exports (PNG, JPEG, WebP)
6. **Streaming**: Real-time partial image display during generation

## Support

For issues or questions:
- Check console logs for detailed error messages
- Verify environment variables are set correctly
- Ensure OpenAI API key has sufficient credits
- Review OpenAI API status page for service disruptions

