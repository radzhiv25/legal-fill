# Legal Document Filler

A web application that allows users to upload legal document templates (`.docx` files) with placeholders and fill them in through an interactive conversational interface.

## Features

- **Document Upload**: Upload `.docx` files with template placeholders
- **Placeholder Detection**: Automatically identifies placeholders in various formats:
  - `{{placeholder}}`
  - `[placeholder]`
  - `{placeholder}`
- **Conversational Interface**: Fill in placeholders one by one through a chat-like interface
- **Document Preview**: Preview the original document while filling in placeholders
- **Download Completed Document**: Download the filled document as a new `.docx` file

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **shadcn/ui** components
- **Tailwind CSS**
- **mammoth** - For parsing `.docx` files
- **docx** - For generating completed `.docx` files

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd legal-fill
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Upload Document**: Click "Choose File" and select a `.docx` file with placeholders
2. **Parse Document**: Click "Upload & Parse Document" to extract placeholders
3. **Fill Placeholders**: Answer the questions in the conversation panel to fill each placeholder
4. **Generate Document**: Once all placeholders are filled, click "Generate Document"
5. **Download**: Preview and download the completed document

## Placeholder Formats

The app supports multiple placeholder formats:
- `{{name}}` - Double curly braces
- `[name]` - Square brackets
- `{name}` - Single curly braces

Example document content:
```
This agreement is entered into between {{company_name}} and [client_name].
The contract value is {contract_amount}.
```

## API Routes

- `POST /api/upload` - Uploads and parses a `.docx` file, returns placeholders and HTML preview
- `POST /api/generate` - Generates a completed `.docx` file with filled placeholders

## Deployment

### Deploy on Vercel

The easiest way to deploy is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import your repository in Vercel
3. Vercel will automatically detect Next.js and configure the build settings
4. Deploy!

### Environment Variables

**No AI API key is required!** The app works fully without any AI integration.

The current implementation uses a simple conversational interface that guides users through filling placeholders one by one. No external AI services (like OpenAI, Anthropic, etc.) are used.

#### Optional: Future AI Enhancement

If you want to add AI capabilities in the future (for smarter suggestions, natural language understanding, etc.), you could:

1. Add an optional AI API key as an environment variable:
   ```bash
   # .env.local (optional)
   OPENAI_API_KEY=your_key_here
   ```

2. The current implementation works perfectly without AI - it's a straightforward form-filling experience with a conversational UI.

## Project Structure

```
legal-fill/
├── app/
│   ├── api/
│   │   ├── upload/
│   │   │   └── route.ts       # Document upload and parsing
│   │   └── generate/
│   │       └── route.ts       # Document generation
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main application page
├── components/
│   └── ui/                    # shadcn/ui components
├── lib/
│   └── utils.ts               # Utility functions
└── public/                    # Static assets
```

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Notes

- The app processes `.docx` files only
- Document formatting may be simplified in the generated output
- Complex formatting (tables, images, etc.) may not be fully preserved
- Placeholders are case-sensitive

## License

This project is created for a test assignment.
