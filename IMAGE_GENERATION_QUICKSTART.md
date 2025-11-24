# Image Generation - Quick Start Guide

## What's New?

The Eco Agent can now generate custom images, infographics, flyers, and visual content using OpenAI's GPT Image API.

## Setup (5 minutes)

### 1. Environment Variables

Add to your `.env.local`:

```bash
# Required
OPENAI_API_KEY=sk-your-openai-key-here

# Already configured (no changes needed)
NEXT_PUBLIC_APP_MODE=development  # or "production"
POLAR_ACCESS_TOKEN=polar_...       # For production billing
```

### 2. Database Setup

#### For Production (Supabase)

Run the migration SQL in your Supabase dashboard:

```bash
# Copy and paste contents of supabase_images_table_migration.sql
# into Supabase SQL Editor and execute
```

Or via CLI:

```bash
supabase db execute < supabase_images_table_migration.sql
```

#### For Development (SQLite)

No action needed! The table will be created automatically via Drizzle ORM.

### 3. Install Dependencies

Already done! OpenAI SDK is already in `package.json`:

```json
{
  "dependencies": {
    "openai": "^6.9.1"
  }
}
```

## Usage

### From Chat Interface

Just ask the agent to create an image:

**Examples:**

```
Create an infographic about Olympia's climate action goals
```

```
Design a flyer for a community tree planting event
```

```
Generate a diagram showing renewable energy sources
```

### The agent will automatically:

1. ✅ Call the `generateImage` tool
2. ✅ Generate the image using OpenAI GPT Image
3. ✅ Save it to the database
4. ✅ Display it in the chat
5. ✅ Track usage (if pay-per-use)

## Testing

### Quick Test (Development Mode)

1. Start your development server:

```bash
npm run dev
```

2. Open chat interface at `http://localhost:3001`

3. Send a message:

```
Create a simple icon of a tree
```

4. Wait ~10-30 seconds for generation

5. Image should appear in chat!

### Verify Database Storage

**Development (SQLite):**

```bash
# Check local database
ls -lh .sqlite/  # Look for db.sqlite file
```

**Production (Supabase):**

```sql
SELECT id, title, size, quality, created_at 
FROM images 
ORDER BY created_at DESC 
LIMIT 5;
```

## Files Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/tools.ts` | Added `generateImage` tool | Main image generation logic |
| `src/lib/db.ts` | Added `createImage()`, `getImage()` | Database operations |
| `src/lib/local-db/schema.ts` | Added `images` table | SQLite schema |
| `src/app/api/images/[imageId]/route.ts` | New endpoint | Serve images via URL |
| `src/lib/polar-events.ts` | Added `trackImageGeneration()` | Usage billing |

## Cost Estimates

| Quality | Size | Est. Cost per Image |
|---------|------|-------------------|
| Low | 1024×1024 | ~$0.006 |
| Medium | 1024×1024 | ~$0.025 |
| High | 1024×1024 | ~$0.100 |
| Medium | 1536×1024 | ~$0.038 |

*Prices include 20% markup for pay-per-use users*

## Troubleshooting

### Error: "OpenAI API key is not configured"

**Fix:**

```bash
# Add to .env.local
OPENAI_API_KEY=sk-your-key-here
```

Then restart dev server.

### Error: "Image generation failed"

**Common causes:**

1. **Invalid API key** - Check key is valid at platform.openai.com
2. **Rate limit** - Wait a minute and try again
3. **Content policy** - Prompt violated OpenAI policies
4. **Insufficient credits** - Add billing to OpenAI account

### Image not displaying

**Check:**

1. Browser console for errors
2. Network tab for failed API calls
3. Database for saved image record

**Quick fix:**

```bash
# Clear browser cache and reload
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

## Advanced Configuration

### Custom Image Sizes

The tool supports three sizes:

- `1024x1024` - Square (default, fastest)
- `1024x1536` - Portrait (good for flyers)
- `1536x1024` - Landscape (good for infographics)

### Quality Options

- `low` - Fast generation (~5-10 seconds)
- `medium` - Balanced (default, ~10-20 seconds)
- `high` - Best quality (~20-60 seconds)

### Transparent Backgrounds

For logos and graphics, use transparent background:

```
Create a logo with a transparent background
```

The tool automatically sets `background: "transparent"` when appropriate.

## Next Steps

1. ✅ Set up OpenAI API key
2. ✅ Run database migration (production only)
3. ✅ Test image generation
4. ✅ Review costs in OpenAI dashboard
5. 📖 Read full documentation in `IMAGE_GENERATION_GUIDE.md`

## Support

- Full documentation: `IMAGE_GENERATION_GUIDE.md`
- OpenAI API docs: https://platform.openai.com/docs/guides/image-generation
- OpenAI status: https://status.openai.com

## Example Prompts

### Infographics

```
Create a modern infographic about Seattle's renewable energy goals 
with charts showing solar, wind, and hydro adoption rates. 
Use green and blue colors with a clean, professional layout.
```

### Flyers

```
Design a community event flyer for "Earth Day 2024" with 
nature imagery, event details placeholder, and vibrant colors.
Portrait orientation.
```

### Diagrams

```
Generate a simple diagram showing the circular economy 
with arrows connecting production, consumption, recycling, 
and reuse. Minimalist style.
```

### Icons/Logos

```
Create a simple icon of a city with green spaces and solar panels, 
suitable for a sustainability app. Transparent background.
```

Enjoy creating visual content with AI! 🎨✨

