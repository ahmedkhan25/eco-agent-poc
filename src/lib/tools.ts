import { z } from "zod";
import { tool } from "ai";
import { Valyu } from "valyu-js";
import { track } from "@vercel/analytics/server";
import { PolarEventTracker } from '@/lib/polar-events';
import { Daytona } from '@daytonaio/sdk';
import { createClient } from '@/utils/supabase/server';
import * as db from '@/lib/db';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';

export const healthcareTools = {
  // Chart Creation Tool - Create interactive charts for biomedical data visualization
  createChart: tool({
    description: `Create interactive charts for biomedical and clinical data visualization.

    CHART TYPES:
    1. "line" - Time series trends (patient outcomes over time, survival curves, biomarker levels)
    2. "bar" - Categorical comparisons (treatment group outcomes, drug efficacy comparison)
    3. "area" - Cumulative data (stacked metrics, composition over time)
    4. "scatter" - Correlation analysis, drug positioning maps, patient stratification
    5. "quadrant" - 2x2 clinical matrices (risk stratification, drug selection matrices)

    TIME SERIES CHARTS (line, bar, area):
    {
      "title": "Pembrolizumab vs Nivolumab Response Rates",
      "type": "line",
      "xAxisLabel": "Weeks Since Treatment Initiation",
      "yAxisLabel": "Overall Response Rate (%)",
      "dataSeries": [
        {
          "name": "Pembrolizumab",
          "data": [
            {"x": "Week 0", "y": 0},
            {"x": "Week 4", "y": 32.5},
            {"x": "Week 12", "y": 45.0}
          ]
        },
        {
          "name": "Nivolumab",
          "data": [
            {"x": "Week 0", "y": 0},
            {"x": "Week 4", "y": 28.0},
            {"x": "Week 12", "y": 40.0}
          ]
        }
      ]
    }

    SCATTER/BUBBLE CHARTS (for positioning, correlation):
    Each SERIES represents a CATEGORY (for color coding).
    Each DATA POINT represents an individual entity with x, y, size, and label.
    {
      "title": "Drug Candidates: Efficacy vs Safety Profile",
      "type": "scatter",
      "xAxisLabel": "Overall Response Rate (%)",
      "yAxisLabel": "Grade 3+ Adverse Events (%)",
      "dataSeries": [
        {
          "name": "Checkpoint Inhibitors",
          "data": [
            {"x": 45.0, "y": 27.3, "size": 5000, "label": "Pembrolizumab"},
            {"x": 40.0, "y": 25.1, "size": 4500, "label": "Nivolumab"}
          ]
        },
        {
          "name": "Chemotherapy",
          "data": [
            {"x": 35.0, "y": 65.0, "size": 3000, "label": "Carboplatin"}
          ]
        }
      ]
    }

    QUADRANT CHARTS (2x2 clinical matrix):
    Same as scatter, but with reference lines dividing chart into 4 quadrants.
    Use for: Risk stratification, treatment selection, drug prioritization.

    CRITICAL: ALL REQUIRED FIELDS MUST BE PROVIDED.`,
    inputSchema: z.object({
      title: z
        .string()
        .describe('Chart title (e.g., "Pembrolizumab vs Nivolumab Response Rates")'),
      type: z
        .enum(["line", "bar", "area", "scatter", "quadrant"])
        .describe(
          'Chart type: "line" (time series), "bar" (comparisons), "area" (cumulative), "scatter" (positioning/correlation), "quadrant" (2x2 matrix)'
        ),
      xAxisLabel: z
        .string()
        .describe('X-axis label (e.g., "Weeks", "Response Rate (%)", "Risk Score (1-10)")'),
      yAxisLabel: z
        .string()
        .describe(
          'Y-axis label (e.g., "Survival Probability", "Adverse Events (%)", "Efficacy Score (1-10)")'
        ),
      dataSeries: z
        .array(
          z.object({
            name: z
              .string()
              .describe(
                'Series name - For time series: drug/treatment name. For scatter/quadrant: category name for color coding (e.g., "Checkpoint Inhibitors", "Chemotherapy")'
              ),
            data: z
              .array(
                z.object({
                  x: z
                    .union([z.string(), z.number()])
                    .describe(
                      'X-axis value - Date/time string for time series, numeric value for scatter/quadrant'
                    ),
                  y: z
                    .number()
                    .describe(
                      "Y-axis numeric value - response rate, survival %, score, etc. REQUIRED for all chart types."
                    ),
                  size: z
                    .number()
                    .optional()
                    .describe(
                      'Bubble size for scatter/quadrant charts (e.g., patient count, trial size, market size). Larger = bigger bubble.'
                    ),
                  label: z
                    .string()
                    .optional()
                    .describe(
                      'Individual entity name for scatter/quadrant charts (e.g., "Pembrolizumab", "Patient Cohort A"). Displayed on/near bubble.'
                    ),
                })
              )
              .describe(
                "Array of data points. For time series: {x: date, y: value}. For scatter/quadrant: {x, y, size, label}."
              ),
          })
        )
        .describe(
          "REQUIRED: Array of data series. For scatter/quadrant: each series = category for color coding, each point = individual entity"
        ),
      description: z
        .string()
        .optional()
        .describe("Optional description explaining what the chart shows"),
    }),
    execute: async ({
      title,
      type,
      xAxisLabel,
      yAxisLabel,
      dataSeries,
      description,
    }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;

      // Calculate metadata based on chart type
      let dateRange = null;
      if (type === 'scatter' || type === 'quadrant') {
        // For scatter/quadrant charts, show x and y axis ranges
        const allXValues = dataSeries.flatMap(s => s.data.map(d => Number(d.x)));
        const allYValues = dataSeries.flatMap(s => s.data.map(d => d.y ?? 0));
        if (allXValues.length > 0 && allYValues.length > 0) {
          dateRange = {
            start: `X: ${Math.min(...allXValues).toFixed(1)}-${Math.max(...allXValues).toFixed(1)}`,
            end: `Y: ${Math.min(...allYValues).toFixed(1)}-${Math.max(...allYValues).toFixed(1)}`,
          };
        }
      } else {
        // For time series charts, show date/label range
        if (dataSeries.length > 0 && dataSeries[0].data.length > 0) {
          dateRange = {
            start: dataSeries[0].data[0].x,
            end: dataSeries[0].data[dataSeries[0].data.length - 1].x,
          };
        }
      }

      await track('Chart Created', {
        chartType: type,
        title: title,
        seriesCount: dataSeries.length,
        totalDataPoints: dataSeries.reduce((sum, series) => sum + series.data.length, 0),
        hasDescription: !!description,
        hasScatterData: dataSeries.some(s => s.data.some(d => d.size || d.label)),
      });

      const chartData = {
        chartType: type,
        title,
        xAxisLabel,
        yAxisLabel,
        dataSeries,
        description,
        metadata: {
          totalSeries: dataSeries.length,
          totalDataPoints: dataSeries.reduce((sum, series) => sum + series.data.length, 0),
          dateRange,
        },
      };

      // Save chart to database
      let chartId: string | null = null;
      try {
        chartId = randomUUID();
        const insertData: any = {
          id: chartId,
          session_id: sessionId || null,
          chart_data: chartData,
        };

        if (userId) {
          insertData.user_id = userId;
        } else {
          insertData.anonymous_id = 'anonymous';
        }

        await db.createChart(insertData);
      } catch (error) {
        console.error('[createChart] Error saving chart:', error);
        chartId = null;
      }

      return {
        ...chartData,
        chartId: chartId || undefined,
        imageUrl: chartId ? `/api/charts/${chartId}/image` : undefined,
      };
    },
  }),

  // CSV Creation Tool - Generate downloadable CSV files for biomedical data
  createCSV: tool({
    description: `Create downloadable CSV files for biomedical data, research tables, and analysis results.

    USE CASES:
    - Export clinical trial results (patient demographics, outcomes, adverse events)
    - Create comparison tables (drug efficacy, treatment protocols, biomarkers)
    - Generate time series data exports (lab values over time, vital signs)
    - Build data tables for further analysis (gene expression, protein levels)
    - Create custom research reports (literature review summaries, study comparisons)

    REFERENCING CSVs IN MARKDOWN:
    After creating a CSV, you MUST reference it in your markdown response to display it as an inline table.

    CRITICAL - Use this EXACT format:
    ![csv](csv:csvId)

    Where csvId is the ID returned in the tool response.

    Example:
    - Tool returns: { csvId: "abc-123-def-456", ... }
    - In your response: "Here is the data:\n\n![csv](csv:abc-123-def-456)\n\n"

    The CSV will automatically render as a formatted markdown table. Do NOT use link syntax [text](csv:id), ONLY use image syntax ![csv](csv:id).

    IMPORTANT GUIDELINES:
    - Use descriptive column headers
    - Include units in headers when applicable (e.g., "Concentration (mg/L)", "Response Rate (%)")
    - Format numbers appropriately (use consistent decimal places)
    - Add a title/description to explain the data
    - Organize data logically (chronological, by treatment group, or by significance)

    EXAMPLE - Drug Comparison:
    {
      "title": "Immunotherapy Drugs - Efficacy Comparison in NSCLC",
      "description": "Key clinical outcomes for checkpoint inhibitors in non-small cell lung cancer",
      "headers": ["Drug", "ORR (%)", "mPFS (months)", "mOS (months)", "Grade 3+ AE (%)", "FDA Approval"],
      "rows": [
        ["Pembrolizumab", "45.0", "10.3", "30.0", "27.3", "2016"],
        ["Nivolumab", "40.0", "9.2", "28.0", "25.1", "2015"],
        ["Atezolizumab", "38.0", "8.8", "26.5", "22.5", "2016"]
      ]
    }

    EXAMPLE - Clinical Trial Results:
    {
      "title": "Phase 3 Trial - Patient Demographics",
      "description": "Baseline characteristics of enrolled patients (N=450)",
      "headers": ["Characteristic", "Treatment Arm (n=225)", "Control Arm (n=225)", "p-value"],
      "rows": [
        ["Age, mean (SD)", "62.5 (8.3)", "61.8 (9.1)", "0.45"],
        ["Male, n (%)", "135 (60%)", "142 (63%)", "0.52"],
        ["Stage IV, n (%)", "180 (80%)", "175 (78%)", "0.61"]
      ]
    }

    EXAMPLE - Lab Values Over Time:
    {
      "title": "Patient 001 - Complete Blood Count Trends",
      "description": "CBC values during treatment (baseline to week 12)",
      "headers": ["Week", "WBC (K/uL)", "RBC (M/uL)", "Hemoglobin (g/dL)", "Platelets (K/uL)"],
      "rows": [
        ["Baseline", "7.2", "4.5", "13.8", "245"],
        ["Week 4", "6.8", "4.3", "13.2", "230"],
        ["Week 8", "7.0", "4.4", "13.5", "238"],
        ["Week 12", "7.3", "4.6", "14.0", "250"]
      ]
    }

    The CSV will be rendered as an interactive table with download capability.`,
    inputSchema: z.object({
      title: z.string().describe("Title for the CSV file (will be used as filename)"),
      description: z.string().optional().describe("Optional description of the data"),
      headers: z.array(z.string()).describe("Column headers for the CSV"),
      rows: z.array(z.array(z.string())).describe("Data rows - each row is an array matching the headers"),
    }),
    execute: async ({ title, description, headers, rows }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;

      try {
        // Validate that all rows have the same number of columns as headers
        const headerCount = headers.length;
        const invalidRows = rows.filter(row => row.length !== headerCount);

        if (invalidRows.length > 0) {
          return {
            error: true,
            message: `❌ **CSV Validation Error**: All rows must have ${headerCount} columns to match headers. Found ${invalidRows.length} invalid row(s). Please regenerate the CSV with matching column counts.`,
            title,
            headers,
            expectedColumns: headerCount,
            invalidRowCount: invalidRows.length,
          };
        }

        // Generate CSV content
        const csvContent = [
          headers.join(','),
          ...rows.map(row =>
            row.map(cell => {
              // Escape cells that contain commas, quotes, or newlines
              if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                return `"${cell.replace(/"/g, '""')}"`;
              }
              return cell;
            }).join(',')
          )
        ].join('\n');

        // Save CSV to database
        let csvId: string | null = null;
        try {
          csvId = randomUUID();

          const insertData: any = {
            id: csvId,
            session_id: sessionId || null,
            title,
            description: description || undefined,
            headers,
            rows: rows,
          };

          if (userId) {
            insertData.user_id = userId;
          } else {
            insertData.anonymous_id = 'anonymous';
          }

          await db.createCSV(insertData);
        } catch (error) {
          console.error('[createCSV] Error saving CSV:', error);
          csvId = null;
        }

        // Track CSV creation
        await track('CSV Created', {
          title: title,
          rowCount: rows.length,
          columnCount: headers.length,
          hasDescription: !!description,
          savedToDb: !!csvId,
        });

        const result = {
          title,
          description,
          headers,
          rows,
          csvContent,
          rowCount: rows.length,
          columnCount: headers.length,
          csvId: csvId || undefined,
          csvUrl: csvId ? `/api/csvs/${csvId}` : undefined,
          _instructions: csvId
            ? `IMPORTANT: Include this EXACT line in your markdown response to display the table:\n\n![csv](csv:${csvId})\n\nDo not write [View Table] or any other text - use the image syntax above.`
            : undefined,
        };

        return result;
      } catch (error: any) {
        return {
          error: true,
          message: `❌ **CSV Creation Error**: ${error.message || 'Unknown error occurred'}`,
          title,
        };
      }
    },
  }),

  generateImage: tool({
    description: `Generate images, infographics, flyers, and visual content using GPT Image AI.

    USE CASES:
    - Create infographics for city planning, climate action, and sustainability initiatives
    - Design flyers and promotional materials for community events
    - Generate visual diagrams for public policy explanations
    - Create educational graphics about environmental topics
    - Design posters for public awareness campaigns
    - Generate concept art for urban planning projects
    - Create visual representations of data and statistics

    IMAGE SPECIFICATIONS:
    - Size options: "1024x1024" (square), "1024x1536" (portrait), "1536x1024" (landscape)
    - Quality options: "low" (fast), "medium" (balanced), "high" (best quality)
    - Background: "opaque" (default) or "transparent" (for logos/graphics)
    - Format: Images are returned as PNG by default

    PROMPT GUIDELINES:
    - Be specific and detailed in your description
    - Include style preferences (e.g., "modern minimalist", "infographic style", "professional")
    - Specify colors, layout, and key elements to include
    - For text-heavy images like flyers, describe the text content and layout
    - For infographics, describe the data visualization approach

    EXAMPLE PROMPTS:
    - "Create a modern infographic about Olympia's climate action plan with green and blue colors, showing renewable energy statistics and carbon reduction goals in a clean, professional layout"
    - "Design a community event flyer for an urban forestry workshop, with nature-inspired colors, tree illustrations, and space for event details in a readable font"
    - "Generate a minimalist poster showing the water cycle in an urban environment, with labels and arrows, suitable for educational purposes"

    The generated image will be automatically displayed in the chat and available for download.`,
    inputSchema: z.object({
      prompt: z
        .string()
        .describe(
          'Detailed description of the image to generate. Be specific about content, style, colors, layout, and any text elements.'
        ),
      size: z
        .enum(['1024x1024', '1024x1536', '1536x1024'])
        .optional()
        .default('1024x1024')
        .describe(
          'Image dimensions: "1024x1024" (square), "1024x1536" (portrait), "1536x1024" (landscape)'
        ),
      quality: z
        .enum(['low', 'medium', 'high'])
        .optional()
        .default('medium')
        .describe('Image quality: "low" (fastest), "medium" (balanced), "high" (best quality)'),
      background: z
        .enum(['opaque', 'transparent'])
        .optional()
        .default('opaque')
        .describe('Background type: "opaque" (solid) or "transparent" (for logos/graphics)'),
      title: z
        .string()
        .optional()
        .describe('Optional title/description for the image (used for filename and metadata)'),
    }),
    execute: async ({ prompt, size, quality, background, title }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';

      const startTime = Date.now();

      try {
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
          return '❌ **Configuration Error**: OpenAI API key is not configured.';
        }

        const openai = new OpenAI({ apiKey: openaiApiKey });

        // Generate the image using OpenAI Image API
        const result = await openai.images.generate({
          model: 'gpt-image-1',
          prompt: prompt,
          size: size || '1024x1024',
          quality: quality || 'medium',
          background: background || 'opaque',
        });

        const executionTime = Date.now() - startTime;

        if (!result.data || result.data.length === 0) {
          return '❌ **Error**: No image was generated. Please try again with a different prompt.';
        }

        const imageBase64 = result.data[0].b64_json;
        const revisedPrompt = result.data[0].revised_prompt || prompt;

        if (!imageBase64) {
          return '❌ **Error**: Failed to retrieve image data.';
        }

        // Save image to database
        let imageId: string | null = null;
        try {
          imageId = randomUUID();

          const insertData: any = {
            id: imageId,
            session_id: sessionId || null,
            prompt: prompt,
            revised_prompt: revisedPrompt,
            size: size || '1024x1024',
            quality: quality || 'medium',
            background: background || 'opaque',
            title: title || undefined,
            image_data: imageBase64,
          };

          if (userId) {
            insertData.user_id = userId;
          } else {
            insertData.anonymous_id = 'anonymous';
          }

          await db.createImage(insertData);
        } catch (error) {
          console.error('[generateImage] Error saving image:', error);
          imageId = null;
        }

        // Track image generation
        await track('Image Generated', {
          size: size || '1024x1024',
          quality: quality || 'medium',
          background: background || 'opaque',
          hasTitle: !!title,
          promptLength: prompt.length,
          executionTime: executionTime,
          savedToDb: !!imageId,
        });

        // Track usage for pay-per-use tier
        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            // Estimate cost based on quality and size
            const estimatedTokens = quality === 'high' ? 4160 : quality === 'medium' ? 1056 : 272;
            await polarTracker.trackImageGeneration(userId, sessionId, {
              prompt,
              size: size || '1024x1024',
              quality: quality || 'medium',
              executionTime,
              estimatedTokens,
            });
          } catch (error) {
            console.error('[generateImage] Failed to track usage:', error);
          }
        }

        return {
          success: true,
          imageId: imageId || undefined,
          imageUrl: imageId ? `/api/images/${imageId}` : undefined,
          // NOTE: We do NOT return imageData (base64) here - it's already saved to DB!
          // Returning it would cause 876K+ token context overflow
          prompt: prompt,
          revisedPrompt: revisedPrompt,
          size: size || '1024x1024',
          quality: quality || 'medium',
          background: background || 'opaque',
          title: title || 'Generated Image',
          executionTime: executionTime,
          _instructions: imageId
            ? `IMPORTANT: Display this image in your response using this EXACT markdown syntax:\n\n![image](image:${imageId})\n\nDo not use any other format. The image is saved in the database and will be loaded automatically.`
            : 'Image generated successfully but could not be saved to database.',
        };
      } catch (error: any) {
        console.error('[generateImage] Error:', error);
        return `❌ **Image Generation Error**: ${error.message || 'Unknown error occurred'}. Please try again with a different prompt or lower quality settings.`;
      }
    },
  }),

  olympiaRAGSearch: tool({
    description: `Search City of Olympia official planning documents. This tool provides semantic search 
  across 26 indexed city documents covering climate action, comprehensive planning, budgets, 
  transportation, infrastructure, public safety, and municipal operations.
  
  LIMIT: Maximum 4 RAG searches per conversation. After reaching limit, use getRAGContext to retrieve 
  previously searched data by context_id instead of searching again. Plan your queries carefully!
  
  Available Documents (26 total):
  - Climate & Environment: Climate Risk Assessment, Sea Level Rise Plan, GHG Inventory, Water Quality/System Plans, Stormwater, Urban Forestry
  - Planning: Neighborhood Centers, Comprehensive Plan 2045 EIS, Housing Action Plan
  - Budget: 2025 Operating Budget, Long-Range Projections, Capital Facilities Plans
  - Transportation: Master Plan, Street Safety Plan
  - Public Safety: Hazard Mitigation, Emergency Management, Police Strategic Plan
  - Other: Parks Plan, Waste Management, Annual Work Plan
  
  CRITICAL: Use this tool FIRST before webSearch when answering Olympia-related questions.
  Only use webSearch if this tool returns insufficient information.
  
  Use this tool when users ask about:
  - Olympia city planning, zoning, and land use
  - Climate action and environmental policies
  - Municipal budgets and financial planning
  - Transportation and infrastructure projects
  - Sustainability and green initiatives
  - Urban development and neighborhood planning
  - Environmental impact and regulations
  - Public safety and emergency planning
  - Parks, recreation, and urban forestry
  - Water quality, stormwater, and sea level rise`,
    
    inputSchema: z.object({
      query: z.string().describe('Natural language question about Olympia city planning, climate, or municipal operations'),
      topK: z.number().min(1).max(15).optional().default(8).describe('Number of relevant document chunks to retrieve (default: 8, max: 15 for comprehensive budget/financial queries)'),
    }),
    
    execute: async ({ query, topK }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      
      const MAX_RAG_CALLS_PER_SESSION = 4;
      
      console.log(`[RAG Tool] Starting search - sessionId: ${sessionId}, query: "${query.substring(0, 50)}..."`);
      
      try {
        // Check RAG call limit for this session
        if (sessionId) {
          const { count: ragCallCount, error: countError } = await db.countRagContextsForSession(sessionId);
          console.log(`[RAG Tool] RAG count for session ${sessionId}: ${ragCallCount}/${MAX_RAG_CALLS_PER_SESSION}`, countError ? `(error: ${countError})` : '');
          
          if (ragCallCount >= MAX_RAG_CALLS_PER_SESSION) {
            console.log(`[RAG Tool] LIMIT REACHED - returning error to agent`);
            // Get existing contexts WITH their brief summaries
            const { data: existingContexts } = await db.listRagContextsForSession(sessionId);
            
            // Build a helpful message with the data that IS available
            const availableData = existingContexts?.map((c: any) => ({
              context_id: c.id,
              query: c.query,
              // Include first 500 chars of summary so AI has usable data
              preview: c.compressed_summary?.substring(0, 500) + (c.compressed_summary?.length > 500 ? '...' : '') || 'No preview',
            })) || [];
            
            // Format readable list
            const readableList = availableData.map((d: any, i: number) => 
              `${i + 1}. Query: "${d.query}"\n   Context ID: ${d.context_id}\n   Preview: ${d.preview.substring(0, 200)}...`
            ).join('\n\n');
            
            return `⛔ **STOP - RAG SEARCH LIMIT REACHED**

This search was BLOCKED. You have used all ${MAX_RAG_CALLS_PER_SESSION} RAG searches for this conversation.

**CRITICAL: Do NOT call olympiaRAGSearch again - it will always fail.**

Instead, answer the user using your previous search results below:

---

${readableList}

---

**YOUR OPTIONS:**
1. Answer using the previews above (they contain key facts)
2. Call \`getRAGContext("context_id")\` for full details from any previous search
3. If data is insufficient, tell the user to start a new chat

**NEVER call olympiaRAGSearch again in this conversation.**`;
          }
        }
        
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
        const response = await fetch(`${baseUrl}/api/eco-rag`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, topK, sessionId }), // Pass sessionId for context storage
        });
        
        if (!response.ok) {
          const error = await response.json();
          return `❌ Error searching Olympia documents: ${error.details || error.error}`;
        }
        
        const data = await response.json();
        
        await track('Olympia RAG Search', {
          query,
          resultCount: data.sources?.length || 0,
          processingTime: data.processingTimeMs,
          tokenCount: data.tokenCount,
        });
        
        // Format sources for citations (include content for frontend display)
        const sourcesMinimal = data.sources?.map((s: any) => ({
          title: s.title,
          page: s.page,
          url: s.url,
          relevanceScore: s.relevanceScore,
          content: s.content,  // Include content for frontend summary display
          source: s.source,
          toolType: s.toolType,
        })) || [];
        
        // Create a brief summary (~1500 tokens / ~6000 chars) from the compressed summary
        // This gives the AI enough context to make decisions without needing getRAGContext
        const briefSummary = data.compressed_summary 
          ? data.compressed_summary.substring(0, 6000) + (data.compressed_summary.length > 6000 ? '...' : '')
          : 'No summary available';
        
        // Get updated count after this search
        let remainingSearches = MAX_RAG_CALLS_PER_SESSION;
        if (sessionId) {
          const { count: newCount } = await db.countRagContextsForSession(sessionId);
          remainingSearches = MAX_RAG_CALLS_PER_SESSION - (newCount || 0);
        }
        
        // Build warning based on remaining searches
        let searchWarning = '';
        if (remainingSearches <= 0) {
          searchWarning = '⛔ NO MORE SEARCHES ALLOWED. Use getRAGContext for follow-up queries.';
        } else if (remainingSearches === 1) {
          searchWarning = '⚠️ LAST SEARCH REMAINING. Make it comprehensive!';
        } else {
          searchWarning = `${remainingSearches} searches remaining.`;
        }
        
        // Return format with substantial brief for immediate AI use
        // Full compressed_summary (up to 8000 tokens) is stored in DB and retrievable via getRAGContext
        return JSON.stringify({
          type: "olympia_planning",
          context_id: data.context_id,           // Reference to stored full context
          brief: briefSummary,                   // Summary for immediate use (~1500 tokens)
          query: query,
          sources: sourcesMinimal,               // Compact source list for citations
          results: sourcesMinimal,               // Alias for citation system
          resultCount: sourcesMinimal.length,
          searchesRemaining: remainingSearches,
          _warning: searchWarning,
          _note: `Full context (up to 8000 tokens) stored. Use getRAGContext("${data.context_id}") for complete details if needed.`,
          displaySource: 'City of Olympia Official Documents'
        }, null, 2);
      } catch (error) {
        return `❌ Error searching Olympia documents: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  }),

  getRAGContext: tool({
    description: `Retrieve full RAG context from a previous olympiaRAGSearch by its context_id.
  
  Use this tool to:
  - Get complete search results from a prior RAG search without making a new search
  - Access detailed compressed summaries that weren't included in the original brief response
  - Review previous search results when you need more information
  
  IMPORTANT: Always use this tool instead of making a new olympiaRAGSearch if:
  - You've already searched for similar information in this conversation
  - You hit the RAG search limit (4 per conversation)
  - You need to reference data from an earlier search
  
  The context_id is returned by every olympiaRAGSearch call.`,
    
    inputSchema: z.object({
      contextId: z.string().describe('The context_id from a previous olympiaRAGSearch result (format: ctx_timestamp_randomstring)'),
    }),
    
    execute: async ({ contextId }) => {
      try {
        const { data: context, error } = await db.getRagContext(contextId);
        
        if (error || !context) {
          return JSON.stringify({
            type: "rag_context_error",
            error: `Could not find RAG context with ID: ${contextId}`,
            suggestion: "Make sure the context_id is correct. You can use olympiaRAGSearch to perform a new search if needed.",
          }, null, 2);
        }
        
        // Parse stored JSON fields
        const fullContext = typeof context.fullContext === 'string' 
          ? JSON.parse(context.fullContext) 
          : context.fullContext;
        const sources = typeof context.sources === 'string' 
          ? JSON.parse(context.sources) 
          : context.sources;
        
        await track('RAG Context Retrieved', {
          contextId,
          query: context.query,
          hasFullContext: !!fullContext,
          sourceCount: sources?.length || 0,
        });
        
        return JSON.stringify({
          type: "rag_context_retrieved",
          context_id: contextId,
          original_query: context.query,
          compressed_summary: context.compressedSummary || context.compressed_summary,
          sources: sources,
          results: sources, // Alias for citation system
          tokenCount: context.tokenCount || context.token_count,
          retrieved_at: new Date().toISOString(),
          displaySource: 'City of Olympia Official Documents (cached)',
        }, null, 2);
      } catch (error) {
        return `❌ Error retrieving RAG context: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  }),

  codeExecution: tool({
    description: `Execute Python code securely in a Daytona Sandbox for biomedical data analysis, statistical calculations, and pharmacokinetic modeling.

    CRITICAL: Always include print() statements to show results. Maximum 10,000 characters.

    Example for biomedical calculations:
    # Calculate drug half-life
    import math
    initial_concentration = 100  # mg/L
    final_concentration = 50     # mg/L
    time_elapsed = 4             # hours
    half_life = time_elapsed * (math.log(2) / math.log(initial_concentration / final_concentration))
    print(f"Calculated half-life: {half_life:.2f} hours")`,
    inputSchema: z.object({
      code: z.string().describe('Python code to execute - MUST include print() statements'),
      description: z.string().optional().describe('Brief description of the calculation'),
    }),
    execute: async ({ code, description }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';

      const startTime = Date.now();

      try {
        if (code.length > 10000) {
          return '🚫 **Error**: Code too long. Please limit your code to 10,000 characters.';
        }

        const daytonaApiKey = process.env.DAYTONA_API_KEY;
        if (!daytonaApiKey) {
          return '❌ **Configuration Error**: Daytona API key is not configured.';
        }

        const serverUrl = process.env.DAYTONA_API_URL;
        if (!serverUrl) {
          return '❌ **Configuration Error**: Daytona API URL is not configured. Set DAYTONA_API_URL in your environment.';
        }

        const daytona = new Daytona({
          apiKey: daytonaApiKey,
          apiUrl: serverUrl,
          target: (process.env.DAYTONA_TARGET as any) || undefined,
        });

        let sandbox: any | null = null;
        try {
          sandbox = await daytona.create({ language: 'python' });
          const execution = await sandbox.process.codeRun(code);
          const executionTime = Date.now() - startTime;

          await track('Python Code Executed', {
            success: execution.exitCode === 0,
            codeLength: code.length,
            executionTime: executionTime,
            hasDescription: !!description,
          });

          if (userId && sessionId && userTier === 'pay_per_use' && execution.exitCode === 0 && !isDevelopment) {
            try {
              const polarTracker = new PolarEventTracker();
              await polarTracker.trackDaytonaUsage(userId, sessionId, executionTime, {
                codeLength: code.length,
                success: true,
                description: description || 'Code execution'
              });
            } catch (error) {
              console.error('[CodeExecution] Failed to track usage:', error);
            }
          }

          if (execution.exitCode !== 0) {
            return `❌ **Execution Error**: ${execution.result || 'Unknown error'}`;
          }

          return `🐍 **Python Code Execution**
${description ? `**Description**: ${description}\n` : ''}

\`\`\`python
${code}
\`\`\`

**Output:**
\`\`\`
${execution.result || '(No output produced)'}
\`\`\`

⏱️ **Execution Time**: ${executionTime}ms`;

        } finally {
          try {
            if (sandbox) {
              await sandbox.delete();
            }
          } catch (cleanupError) {
            console.error('[CodeExecution] Cleanup error:', cleanupError);
          }
        }
      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error occurred';
        
        // Detect if Daytona returned HTML instead of JSON (rate limit or API error)
        if (errorMessage.includes('<!doctype') || errorMessage.includes('<html') || errorMessage.includes('Framer')) {
          return `❌ **Daytona API Error**: The Daytona service returned an error page instead of a response. This usually means:
- Rate limit exceeded on Daytona's free tier
- API key is invalid or expired
- Service is temporarily unavailable

Please check your Daytona dashboard at https://app.daytona.io to verify your account status.`;
        }
        
        return `❌ **Error**: ${errorMessage}`;
      }
    },
  }),

  // ===================================================================================
  // BIOMEDICAL TOOLS (COMMENTED OUT - Preserved for potential future use)
  // Uncomment if biomedical research features are needed
  // ===================================================================================

  /*
  clinicalTrialsSearch: tool({
    description: "Search for clinical trials based on conditions, drugs, or research criteria using ClinicalTrials.gov data",
    inputSchema: z.object({
      query: z.string().describe('Clinical trials search query (e.g., "Phase 3 melanoma immunotherapy")'),
      maxResults: z.number().min(1).max(20).optional().default(10).describe('Maximum number of results'),
    }),
    execute: async ({ query, maxResults }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';

      try {
        const apiKey = process.env.VALYU_API_KEY;
        if (!apiKey) {
          return "❌ Valyu API key not configured.";
        }
        const valyu = new Valyu(apiKey, "https://api.valyu.network/v1");

        const response = await valyu.search(query, {
          maxNumResults: 6,
          searchType: "proprietary",
          includedSources: ["valyu/valyu-clinical-trials"],
          relevanceThreshold: 0.4,
          isToolCall: true,
        });

        await track("Valyu API Call", {
          toolType: "clinicalTrialsSearch",
          query: query,
          resultCount: response?.results?.length || 0,
        });

        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            await polarTracker.trackValyuAPIUsage(userId, sessionId, "clinicalTrialsSearch", valyuCostDollars, {
              query,
              resultCount: response?.results?.length || 0,
              success: true,
            });
          } catch (error) {
            console.error('[ClinicalTrialsSearch] Failed to track usage:', error);
          }
        }

        return JSON.stringify({
          type: "clinical_trials",
          query: query,
          resultCount: response?.results?.length || 0,
          results: response?.results || [],
          favicon: 'https://clinicaltrials.gov/favicon.ico',
          displaySource: 'ClinicalTrials.gov'
        }, null, 2);
      } catch (error) {
        return `❌ Error searching clinical trials: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  }),

  drugInformationSearch: tool({
    description: "Search FDA drug labels for medication information, warnings, contraindications using DailyMed data",
    inputSchema: z.object({
      query: z.string().describe('Drug information search query (e.g., "warfarin contraindications")'),
      maxResults: z.number().min(1).max(10).optional().default(5).describe('Maximum number of results'),
    }),
    execute: async ({ query, maxResults }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';

      try {
        const apiKey = process.env.VALYU_API_KEY;
        if (!apiKey) {
          return "❌ Valyu API key not configured.";
        }
        const valyu = new Valyu(apiKey, "https://api.valyu.network/v1");

        const response = await valyu.search(query, {
          maxNumResults: maxResults || 5,
          searchType: "proprietary",
          includedSources: ["valyu/valyu-drug-labels"],
          relevanceThreshold: 0.5,
          isToolCall: true,
        });

        await track("Valyu API Call", {
          toolType: "drugInformationSearch",
          query: query,
          resultCount: response?.results?.length || 0,
        });

        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            await polarTracker.trackValyuAPIUsage(userId, sessionId, "drugInformationSearch", valyuCostDollars, {
              query,
              resultCount: response?.results?.length || 0,
              success: true,
            });
          } catch (error) {
            console.error('[DrugInformationSearch] Failed to track usage:', error);
          }
        }

        return JSON.stringify({
          type: "drug_information",
          query: query,
          resultCount: response?.results?.length || 0,
          results: response?.results || [],
          favicon: 'https://dailymed.nlm.nih.gov/dailymed/image/NLM-logo.png',
          displaySource: 'DailyMed (NIH)'
        }, null, 2);
      } catch (error) {
        return `❌ Error searching drug information: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  }),

  biomedicalLiteratureSearch: tool({
    description: "Search PubMed, ArXiv, and academic journals for scientific papers and biomedical research",
    inputSchema: z.object({
      query: z.string().describe('Biomedical literature search query (e.g., "CRISPR gene editing safety")'),
      maxResults: z.number().min(1).max(20).optional().default(10).describe('Maximum number of results'),
    }),
    execute: async ({ query, maxResults }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';

      try {
        const apiKey = process.env.VALYU_API_KEY;
        if (!apiKey) {
          return "❌ Valyu API key not configured.";
        }
        const valyu = new Valyu(apiKey, "https://api.valyu.network/v1");

        const response = await valyu.search(query, {
          maxNumResults: maxResults || 10,
          searchType: "proprietary",
          includedSources: ["valyu/valyu-pubmed", "valyu/valyu-arxiv", "valyu/valyu-medrxiv", "valyu/valyu-biorxiv"],
        });

        await track("Valyu API Call", {
          toolType: "biomedicalLiteratureSearch",
          query: query,
          resultCount: response?.results?.length || 0,
        });

        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            await polarTracker.trackValyuAPIUsage(userId, sessionId, "biomedicalLiteratureSearch", valyuCostDollars, {
              query,
              resultCount: response?.results?.length || 0,
              success: true,
            });
          } catch (error) {
            console.error('[BiomedicalLiteratureSearch] Failed to track usage:', error);
          }
        }

        return JSON.stringify({
          type: "biomedical_literature",
          query: query,
          resultCount: response?.results?.length || 0,
          results: response?.results || [],
        }, null, 2);
      } catch (error) {
        return `❌ Error searching biomedical literature: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  }),
  */

  webSearch: tool({
    description: "Search the web for general information on any topic",
    inputSchema: z.object({
      query: z.string().describe('Search query for any topic'),
      maxResults: z.number().min(1).max(20).optional().default(5).describe('Maximum number of results'),
    }),
    execute: async ({ query, maxResults }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';

      try {
        const valyu = new Valyu(process.env.VALYU_API_KEY, "https://api.valyu.network/v1");

        const response = await valyu.search(query, {
          searchType: "all" as const,
          maxNumResults: maxResults || 5,
          isToolCall: true,
        });

        await track("Valyu API Call", {
          toolType: "webSearch",
          query: query,
          resultCount: response?.results?.length || 0,
        });

        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            await polarTracker.trackValyuAPIUsage(userId, sessionId, "webSearch", valyuCostDollars, {
              query,
              resultCount: response?.results?.length || 0,
              success: true,
            });
          } catch (error) {
            console.error('[WebSearch] Failed to track usage:', error);
          }
        }

        return JSON.stringify({
          type: "web_search",
          query: query,
          resultCount: response?.results?.length || 0,
          results: response?.results || [],
        }, null, 2);
      } catch (error) {
        return `❌ Error performing web search: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  }),
};

// Export with both names for compatibility
export const biomedicalTools = healthcareTools;
