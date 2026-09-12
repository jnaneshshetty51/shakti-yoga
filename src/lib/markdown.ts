import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

marked.setOptions({ breaks: true, gfm: true });

/**
 * Markdown authored in the admin CMS -> safe HTML for a server component to
 * render via dangerouslySetInnerHTML. Sanitized even though only admins author
 * this content — a compromised or careless admin account shouldn't be able to
 * inject a script tag into every visitor's browser.
 */
export function renderMarkdown(source: string): string {
    const html = marked.parse(source, { async: false });
    return sanitizeHtml(html, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
        allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            img: ['src', 'alt', 'title'],
            a: ['href', 'name', 'target', 'rel'],
        },
    });
}
