const sanitizeHtml = require('sanitize-html');

const MAX_TITLE_LENGTH = 100;
const MAX_CONTENT_LENGTH = 10000;

const sanitizeText = (text, maxLength) => {
    if (typeof text !== 'string') return '';
    
    // A címeknél továbbra is tiltunk minden HTML-t
    if (maxLength <= MAX_TITLE_LENGTH) {
        return text.replace(/<[^>]*>?/gm, '').substring(0, maxLength);
    }

    // A tartalomnál engedélyezzük a biztonságos formázást
    const clean = sanitizeHtml(text, {
        allowedTags: ['b', 'i', 'em', 'strong', 'u', 'ul', 'ol', 'li', 'p', 'br', 'div', 'span', 'img'],
        allowedAttributes: {
            'span': ['style'], // Ha a szerkesztő stílusokat is használna
            'p': ['style'],
            'img': ['src', 'alt', 'title', 'width', 'height']
        },
        allowedSchemes: ['http', 'https', 'data']
    });

    return clean.substring(0, maxLength);
};

const sanitizeTags = (tags) => {
    if (!Array.isArray(tags)) return [];
    return tags
        .map(tag => typeof tag === 'string' ? tag.replace(/<[^>]*>?/gm, '').trim() : '')
        .filter(tag => tag.length > 0 && tag.length <= 20);
};

module.exports = {
    sanitizeText,
    sanitizeTags,
    MAX_TITLE_LENGTH,
    MAX_CONTENT_LENGTH
};