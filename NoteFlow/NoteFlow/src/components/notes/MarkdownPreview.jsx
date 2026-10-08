import ReactMarkdown from 'react-markdown';

// react-markdown does not render raw HTML, so user content cannot inject markup or scripts.
const components = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer nofollow" />,
};

export default function MarkdownPreview({ content }) {
  if (!content.trim()) return <p className="text-sm text-muted">Nothing to preview yet.</p>;
  return (
    <div className="prose-note">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
