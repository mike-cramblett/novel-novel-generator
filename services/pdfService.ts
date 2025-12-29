// This assumes jsPDF is loaded from a CDN in index.html
declare const jspdf: any;
declare const pdfjsLib: any;

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
}

export async function extractTextFromPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        if (textContent.items.length === 0) {
            fullText += '\n'; // Preserve blank pages
            continue;
        }

        // Group text items into lines based on Y-coordinate
        const lines = textContent.items.reduce((acc: { y: number; items: { x: number; str: string; height: number; }[] }[], item: any) => {
            const yThreshold = 5; // Group items within 5px vertically into one line
            let line = acc.find(l => Math.abs(l.y - item.transform[5]) < yThreshold);
            if (line) {
                line.items.push({ x: item.transform[4], str: item.str, height: item.height });
            } else {
                acc.push({ y: item.transform[5], items: [{ x: item.transform[4], str: item.str, height: item.height }] });
            }
            return acc;
        }, []);

        // Sort lines by y-coordinate (top to bottom).
        lines.sort((a, b) => b.y - a.y);
        
        let pageText = '';
        if (lines.length > 0) {
            // Process the first line
            const firstLineItems = lines[0].items.sort((a, b) => a.x - b.x);
            pageText += firstLineItems.map(item => item.str).join(' ');

            // Process subsequent lines, intelligently adding spaces or paragraph breaks
            for (let i = 1; i < lines.length; i++) {
                const prevLine = lines[i-1];
                const currentLine = lines[i];
                
                const prevLineAvgHeight = prevLine.items.reduce((sum, item) => sum + item.height, 0) / prevLine.items.length || 12;
                const yDiff = Math.abs(currentLine.y - prevLine.y);

                // Heuristic: If vertical gap is > 1.4x line height, it's a new paragraph.
                if (yDiff > prevLineAvgHeight * 1.4) {
                    pageText += '\n\n';
                } else { // Otherwise, it's a line wrap.
                    const prevLineText = prevLine.items.map(item => item.str).join('').trim();
                    if (prevLineText.endsWith('-')) {
                        pageText = pageText.trim().slice(0, -1); // Join hyphenated words
                    } else {
                        pageText += ' ';
                    }
                }
                
                const currentLineItems = currentLine.items.sort((a, b) => a.x - b.x);
                pageText += currentLineItems.map(item => item.str).join(' ');
            }
        }

        fullText += pageText + '\n\n';
    }
    
    // A final regex cleanup pass to handle common extraction artifacts,
    // like a chapter title getting merged with the first sentence.
    let cleanedText = fullText.trim().replace(/(Chapter (\d+|[IVXLCDM]+):?[^\r\n]+?)([A-Z])/g, '$1\n\n$3');
    
    return cleanedText;
}

export function exportNovelAsPDF(title: string, content: string): void {
  const { jsPDF } = jspdf;
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a5' // A good size for an eBook
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxLineWidth = pageWidth - margin * 2;
  const lineHeighUnit = 5;
  let y = margin;
  let isFirstContentElement = true;

  const addPageIfNeeded = (currentY: number, spaceNeeded: number = 5): number => {
    if (currentY > pageHeight - margin - spaceNeeded) {
      doc.addPage();
      return margin;
    }
    return currentY;
  };

  // --- Title Page ---
  doc.setFont('Merriweather', 'bold');
  doc.setFontSize(28);
  const titleLines = doc.splitTextToSize(title, maxLineWidth);
  const titleY = (pageHeight / 2) - (titleLines.length * 10 / 2);
  doc.text(titleLines, pageWidth / 2, titleY, { align: 'center' });
  
  doc.addPage();
  y = margin;

  // --- Novel Content ---
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  paragraphs.forEach(paragraph => {
    paragraph = paragraph.trim();
    y = addPageIfNeeded(y, 20); // Ensure space for at least a few lines
    
    if (paragraph.match(/^Chapter (\d+|[IVXLCDM]+):?/i)) {
      // Chapter Title
      if (!isFirstContentElement) {
        y = addPageIfNeeded(y, 30); // Check if we need a new page for the chapter title
        if (y !== margin) { // If we didn't just add a new page, add some space.
            y += lineHeighUnit * 2;
        }
      }
      doc.setFont('Merriweather', 'bold');
      doc.setFontSize(18);
      const chapterTitleLines = doc.splitTextToSize(paragraph, maxLineWidth);
      doc.text(chapterTitleLines, margin, y);
      y += (chapterTitleLines.length * 7) + 8; // Adjust space after title
    } else {
      // Regular Text Paragraph
      doc.setFontSize(11);

      const segments = paragraph.split(/(\*.*?\*)/g).filter(Boolean).map(seg => {
        const isItalic = seg.startsWith('*') && seg.endsWith('*');
        return {
            text: isItalic ? seg.slice(1, -1) : seg,
            style: isItalic ? 'italic' : 'normal'
        };
      });

      let x = margin;
      
      segments.forEach(segment => {
          doc.setFont('Merriweather', segment.style);
          // Split text into words and spaces, keeping spaces to preserve layout.
          const tokens = segment.text.split(/(\s+)/).filter(Boolean);

          tokens.forEach(token => {
              const tokenWidth = doc.getTextWidth(token);
              
              // Check for line wrap BEFORE printing the token. Don't wrap for leading spaces on a new line.
              if (x + tokenWidth > pageWidth - margin && !token.match(/^\s+$/)) {
                  x = margin;
                  y += lineHeighUnit;
                  y = addPageIfNeeded(y);
              }
              
              // For a new line, we don't want to print a leading space.
              if (x === margin && token.match(/^\s+$/)) {
                  // do nothing, skip this space.
              } else {
                  doc.text(token, x, y);
                  x += tokenWidth;
              }
          });
      });
      // After processing all segments of a paragraph, move y for the next paragraph
      y += lineHeighUnit * 2; // Gap after paragraph
    }
    isFirstContentElement = false;
  });

  const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`${safeTitle}.pdf`);
}