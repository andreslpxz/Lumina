export const truncateFileContent = (content: string, maxLines: number = 200) => {
  const lines = content.split('\n');
  if (lines.length <= maxLines) return content;

  const half = Math.floor(maxLines / 2);
  const firstPart = lines.slice(0, half).join('\n');
  const lastPart = lines.slice(lines.length - half).join('\n');

  return `${firstPart}\n\n... [${lines.length - maxLines} lines truncated] ...\n\n${lastPart}`;
};
