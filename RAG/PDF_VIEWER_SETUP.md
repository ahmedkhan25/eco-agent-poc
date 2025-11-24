# PDF Viewer Setup - Complete! ✅

## Overview

The RAG test interface now includes **clickable PDF links** with both preview and direct viewing options!

## Features Added

### 1. **PDF Preview Button** 👁️
- Opens an inline modal viewer
- Automatically jumps to the referenced page
- Full-screen viewing experience
- No need to leave the page

### 2. **Open PDF Button** 📄
- Opens PDF in a new browser tab
- Direct link to the specific page
- Perfect for detailed reading or downloading

### 3. **Public S3 Access**
- Configured `olympia-plans-raw` bucket for public read access
- PDFs are accessible via direct HTTPS URLs
- Format: `https://olympia-plans-raw.s3.us-west-2.amazonaws.com/pdfs/<filename>.pdf`

## How It Works

### Source Display
Each source citation now includes:
- **Document title** (e.g., "Olympia Neighborhood Centers Strategy")
- **Page number** (e.g., "Page 13")
- **Similarity distance** (e.g., "Distance: 0.2281")
- **S3 key** (e.g., "pdfs/Neighborhood-Centers-Report.pdf")
- **Two action buttons:**
  - 👁️ **Preview** - Opens inline modal viewer
  - 📄 **Open PDF** - Opens in new tab with page anchor

### Technical Implementation

#### Frontend Changes (`src/app/eco-rag-test/page.tsx`)

1. **S3 URL Generation:**
   ```typescript
   const S3_BUCKET = 'olympia-plans-raw';
   const S3_REGION = 'us-west-2';

   const getS3Url = (s3Key?: string) => {
     if (!s3Key) return null;
     return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${s3Key}`;
   };
   ```

2. **Page Anchors:**
   ```typescript
   const pdfUrlWithPage = pdfUrl ? `${pdfUrl}#page=${source.page}` : null;
   ```

3. **Inline Viewer Modal:**
   - Uses Shadcn Dialog component
   - Embeds PDF in iframe with page parameter
   - Full-screen responsive layout

#### Backend Changes (S3 Bucket Policy)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::olympia-plans-raw/pdfs/*"
    }
  ]
}
```

## Setup Script

### Enable Public PDF Access

Run this script to configure public access (already done):

```bash
./RAG/enable-public-pdf-access.sh
```

This script:
1. ✅ Disables S3 Block Public Access
2. ✅ Creates bucket policy for public read
3. ✅ Verifies policy configuration
4. ✅ Tests public access with sample PDF

## Testing

### 1. Via Web Interface

1. Navigate to: `http://localhost:3001/eco-rag-test`
2. Query: "What are the neighborhood centers in Olympia?"
3. Check the **Sources** section
4. Click **👁️ Preview** to see inline viewer
5. Click **📄 Open PDF** to open in new tab

### 2. Direct URL Test

Test a PDF URL directly:
```
https://olympia-plans-raw.s3.us-west-2.amazonaws.com/pdfs/Neighborhood-Centers-Report.pdf
```

### 3. With Page Anchor

Jump to a specific page:
```
https://olympia-plans-raw.s3.us-west-2.amazonaws.com/pdfs/Neighborhood-Centers-Report.pdf#page=13
```

## Example User Flow

1. **User asks:** "What are the neighborhood centers in Olympia?"

2. **RAG returns:**
   - AI-generated answer
   - 3-5 source citations

3. **For each source:**
   ```
   📘 Olympia Neighborhood Centers Strategy
   Page 13 • Distance: 0.2281
   pdfs/Neighborhood-Centers-Report.pdf
   
   [👁️ Preview] [📄 Open PDF]
   ```

4. **User clicks "Preview":**
   - Modal opens with embedded PDF
   - Automatically scrolls to page 13
   - Can read in context

5. **User clicks "Open PDF":**
   - New tab opens
   - Direct link to page 13
   - Can download or bookmark

## Browser Compatibility

- ✅ **Chrome/Edge** - Full support
- ✅ **Firefox** - Full support
- ✅ **Safari** - Full support (with built-in PDF viewer)
- ✅ **Mobile** - Opens native PDF viewer

## Security Considerations

### Why Public Access is OK

These are **public city planning documents**:
- Available on olympiawa.gov
- No sensitive information
- Meant for public consumption
- Open government data

### Alternative: Signed URLs

If you need private access, implement signed URLs:

```typescript
// Backend endpoint to generate signed URLs
export async function GET(req: Request) {
  const { s3Key } = await req.json();
  
  const command = new GetObjectCommand({
    Bucket: 'olympia-plans-raw',
    Key: s3Key,
  });
  
  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600, // 1 hour
  });
  
  return Response.json({ signedUrl });
}
```

## Troubleshooting

### PDFs Not Loading

1. **Check bucket policy:**
   ```bash
   aws s3api get-bucket-policy \
     --bucket olympia-plans-raw \
     --profile ecoheart
   ```

2. **Verify public access is disabled:**
   ```bash
   aws s3api get-public-access-block \
     --bucket olympia-plans-raw \
     --profile ecoheart
   ```

3. **Test URL directly:**
   ```bash
   curl -I "https://olympia-plans-raw.s3.us-west-2.amazonaws.com/pdfs/Neighborhood-Centers-Report.pdf"
   ```

### CORS Issues

If you see CORS errors, add CORS policy:

```bash
aws s3api put-bucket-cors \
  --bucket olympia-plans-raw \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET"],
      "AllowedHeaders": ["*"]
    }]
  }' \
  --profile ecoheart
```

## Next Enhancements

Potential future improvements:

1. **PDF Text Selection** - Allow users to highlight and copy text
2. **Annotation Support** - Add notes directly in the viewer
3. **Download Progress** - Show loading state for large PDFs
4. **Thumbnail Preview** - Show page thumbnails in source cards
5. **Search in PDF** - Find text within the viewed PDF
6. **Mobile Optimization** - Better mobile PDF viewing experience

## Files Modified

- ✅ `src/app/eco-rag-test/page.tsx` - Added PDF viewer UI
- ✅ `RAG/enable-public-pdf-access.sh` - S3 configuration script
- ✅ `RAG/PDF_VIEWER_SETUP.md` - This documentation

## Summary

🎉 **PDF viewing is now fully functional!**

Users can now:
- ✅ Preview PDFs inline without leaving the page
- ✅ Open PDFs in new tabs with direct page links
- ✅ Access all 26 Olympia planning documents
- ✅ Verify sources by reading the original documents

This creates a complete, transparent research experience where users can both get AI-generated answers **and** verify them against the original source documents!

