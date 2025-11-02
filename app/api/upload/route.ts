import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.docx')) {
      return NextResponse.json(
        { error: 'File must be a .docx file' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert docx to HTML
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value;

    // Extract text for placeholder detection
    const textResult = await mammoth.extractRawText({ buffer });
    const text = textResult.value;

    // Find placeholders - supporting various formats:
    // {{placeholder}}, {{ placeholder }}, [placeholder], {placeholder}
    const placeholderRegex = /\{\{([^}]+)\}\}|\[([^\]]+)\]|\{([^}]+)\}/g;
    const placeholders = new Set<string>();
    
    // Check text for placeholders
    let match;
    while ((match = placeholderRegex.exec(text)) !== null) {
      const placeholder = (match[1] || match[2] || match[3]).trim();
      if (placeholder) {
        placeholders.add(placeholder);
      }
    }

    // Reset regex and check HTML for placeholders
    placeholderRegex.lastIndex = 0;
    while ((match = placeholderRegex.exec(html)) !== null) {
      const placeholder = (match[1] || match[2] || match[3]).trim();
      if (placeholder) {
        placeholders.add(placeholder);
      }
    }

    const placeholderList = Array.from(placeholders);

    return NextResponse.json({
      html,
      text,
      placeholders: placeholderList,
      fileName: file.name,
    });
  } catch (error) {
    console.error('Error processing document:', error);
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    );
  }
}

