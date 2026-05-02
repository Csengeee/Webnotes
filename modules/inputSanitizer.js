// Külső könyvtár importálása, amely professzionális szinten szűri a HTML tartalmat
const sanitizeHtml = require('sanitize-html');

// Globális korlátok beállítása a memória és az adatbázis védelmében
const MAX_TITLE_LENGTH = 100;    // Jegyzet címe max 100 karakter
const MAX_CONTENT_LENGTH = 10000; // Jegyzet tartalma max 10.000 karakter

/**
 * Általános szövegtisztító függvény
 * @param {string} text - A tisztítandó nyers szöveg
 * @param {number} maxLength - A megengedett maximális hossz
 */
const sanitizeText = (text, maxLength) => {
    // Típusellenőrzés: ha nem szöveg érkezik, üres stringet adunk vissza a hiba elkerülése végett
    if (typeof text !== 'string') return '';
    
    // LOGIKA SZÉTVÁLASZTÁSA: Cím vs. Tartalom
    
    // 1. Ha a szöveg rövid (pl. Cím), akkor Szigorú szűrést alkalmazunk:
    // Minden létező HTML taget (pl. <b>, <div>) könyörtelenül eltávolítunk egy Regex segítségével.
    if (maxLength <= MAX_TITLE_LENGTH) {
        return text.replace(/<[^>]*>?/gm, '').substring(0, maxLength);
    }

    // 2. Ha a szöveg hosszú (pl. Jegyzet tartalma), Engedékenyebb szűrést alkalmazunk:
    // Itt engedélyezzük a formázást, hogy a felhasználó tudjon félkövérrel írni vagy listákat készíteni.
    const clean = sanitizeHtml(text, {
        // Csak ezeket a HTML elemeket tarthatja meg a szövegben
        allowedTags: ['b', 'i', 'em', 'strong', 'u', 'ul', 'ol', 'li', 'p', 'br', 'div', 'span', 'img'],
        
        // Meghatározzuk, hogy melyik tagnél milyen attribútum engedélyezett
        allowedAttributes: {
            'span': ['style'], // Színek, betűméretek megtartásához
            'p': ['style'],
            'img': ['src', 'alt', 'title', 'width', 'height'] // Képek megjelenítéséhez szükséges adatok
        },
        
        // Csak biztonságos protokollokból érkezhetnek linkek/képek
        allowedSchemes: ['http', 'https', 'data'] // A 'data' engedélyezi a base64 kódolt képeket
    });

    // A tisztított szöveget a végén még levágjuk a maximum hossznál
    return clean.substring(0, maxLength);
};

/**
 * Címkék (tags) tisztítása
 * @param {Array} tags - Címkék tömbje (pl. ["munka", "fontos"])
 */
const sanitizeTags = (tags) => {
    // Ha nem tömböt kaptunk, üres listával térünk vissza
    if (!Array.isArray(tags)) return [];

    return tags
        .map(tag => 
            // Minden egyes címkéből kiszűrjük a HTML-t, és levágjuk a széleiről a szóközöket
            typeof tag === 'string' ? tag.replace(/<[^>]*>?/gm, '').trim() : ''
        )
        // Csak azokat tartjuk meg, amik nem üresek és nem hosszabbak 20 karakternél
        .filter(tag => tag.length > 0 && tag.length <= 20);
};

// Funkciók és konstansok exportálása
module.exports = {
    sanitizeText,
    sanitizeTags,
    MAX_TITLE_LENGTH,
    MAX_CONTENT_LENGTH
};