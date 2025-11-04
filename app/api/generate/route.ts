import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from 'docx';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { originalFile, placeholders, fileName } = body;

    if (!originalFile || !placeholders) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      );
    }

    // Convert base64 back to buffer
    const buffer = Buffer.from(originalFile, 'base64');

    // Convert original document to HTML for preview
    const htmlResult = await mammoth.convertToHtml({ buffer });
    let completedHtml = htmlResult.value;

    // Extract text from original document
    const textResult = await mammoth.extractRawText({ buffer });
    let text = textResult.value;

    // Replace placeholders with values in both HTML and text
    Object.entries(placeholders).forEach(([key, value]) => {
      const valueStr = String(value || '');
      // Escape special regex characters in key
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Replace various placeholder formats
      const placeholderPatterns = [
        new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'g'),
        new RegExp(`\\[\\s*${escapedKey}\\s*\\]`, 'g'),
        new RegExp(`\\{\\s*${escapedKey}\\s*\\}`, 'g'),
      ];
      
      placeholderPatterns.forEach(pattern => {
        text = text.replace(pattern, valueStr);
        completedHtml = completedHtml.replace(pattern, valueStr);
      });
    });

    // Create new document with replaced text
    // Split by paragraphs (double newlines) and preserve structure
    const paragraphs = text.split(/\n\s*\n/).map((para) => {
      if (para.trim()) {
        // Split by single newlines within paragraph for line breaks
        const runs = para.split('\n').map((line, index, array) => {
          return new TextRun({
            text: line.trim(),
            break: index < array.length - 1 ? 1 : 0,
          });
        });

        return new Paragraph({
          children: runs,
          spacing: { after: 200 },
        });
      }
      return new Paragraph({
        children: [new TextRun('')],
        spacing: { after: 200 },
      });
    });

    // If no paragraphs, add one with the text
    const docChildren =
      paragraphs.length > 0
        ? paragraphs
        : [
            new Paragraph({
              children: [new TextRun(text)],
            }),
          ];

    const doc = new Document({
      sections: [
        {
          children: docChildren,
        },
      ],
    });

    // Generate document buffer
    const docBuffer = await Packer.toBuffer(doc);

    // Return as base64
    const base64 = docBuffer.toString('base64');

    const outputFileName = fileName
      ? fileName.replace(/\.docx$/, '_completed.docx')
      : 'completed.docx';

    return NextResponse.json({
      file: base64,
      fileName: outputFileName,
      html: completedHtml, // Return completed HTML for preview
    });
  } catch (error) {
    console.error('Error generating document:', error);
    return NextResponse.json(
      { error: 'Failed to generate document' },
      { status: 500 }
    );
  }
}

