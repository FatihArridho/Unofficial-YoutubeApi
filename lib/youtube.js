const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Parse duration string (e.g., "1:23:45", "5:30", "45") to total seconds.
 * Handles edge cases: live broadcasts (null/undefined), malformed strings.
 */
function parseDuration(duration) {
   if (!duration || typeof duration !== 'string') return null;
   // YouTube Indonesian locale sometimes uses dots (e.g., "1.26.43") instead of colons
   // Normalize: if no colon but has dots with 2-3 parts, treat as duration separator
   let normalized = duration;
   if (!duration.includes(':') && duration.includes('.')) {
      const dotParts = duration.split('.');
      // Only treat as duration if all parts are numeric and length is 2-3
      if (dotParts.length >= 2 && dotParts.length <= 3 && dotParts.every(p => /^\d{1,2}$/.test(p))) {
         normalized = dotParts.join(':');
      }
   }
   const parts = normalized.split(':').map(Number);
   if (parts.some(isNaN)) return null;
   let seconds = 0;
   for (let i = 0; i < parts.length; i++) {
      seconds += parts[i] * Math.pow(60, parts.length - 1 - i);
   }
   return seconds;
}

/**
 * Format duration in seconds to human-readable string (e.g., "1 jam 23 menit 45 detik").
 */
function formatDurationID(seconds) {
   if (seconds == null) return null;
   const h = Math.floor(seconds / 3600);
   const m = Math.floor((seconds % 3600) / 60);
   const s = Math.floor(seconds % 60);
   const parts = [];
   if (h > 0) parts.push(`${h} jam`);
   if (m > 0) parts.push(`${m} menit`);
   if (s > 0 || parts.length === 0) parts.push(`${s} detik`);
   return parts.join(' ');
}

/**
 * Parse view count string (e.g., "1.2 jt tayangan", "345K views") to a number.
 * Returns the parsed number or null.
 */
function parseViewCount(viewStr) {
   if (!viewStr || typeof viewStr !== 'string') return null;

   const lower = viewStr.toLowerCase();

   // Multiplier suffixes sorted longest-first to avoid partial matches.
   // Word boundary: char before suffix must not be [a-z], char after must not be [a-z].
   // "19,9 jt subscriber" â†’ 'jt' at pos 4, char after is ' ' â†’ valid âœ…
   // "896.804 x ditonton" â†’ 'b' in "subscriber" has 'r' before â†’ invalid âŒ
   const multipliers = [
      ['billion',  1e9], ['milyar', 1e9], ['miliar', 1e9],
      ['million',  1e6], ['thousand', 1e3],
      ['juta',     1e6], ['ribu',     1e3],
      ['rbu',      1e3], ['jt',       1e6], ['rb', 1e3],
      ['b',        1e9], ['m',        1e6], ['k',  1e3],
   ];

   function isWordBoundary(str, idx, suffixLen) {
      const before = idx > 0 ? str[idx - 1] : ' ';
      const after  = str[idx + suffixLen];
      return !/[a-z]/.test(before) && !/[a-z]/.test(after);
   }

   for (const [suffix, mult] of multipliers) {
      let searchFrom = 0;
      while (true) {
         const idx = lower.indexOf(suffix, searchFrom);
         if (idx === -1) break;
         if (isWordBoundary(lower, idx, suffix.length)) {
            // Found a valid word-boundary match
            const numPart = viewStr.substring(0, idx).trim();
            const cleaned = numPart.replace(/[^0-9.,]/g, '');
            if (cleaned) {
               const parsed = parseNumberString(cleaned);
               if (parsed !== null) return Math.round(parsed * mult);
            }
         }
         searchFrom = idx + 1;
      }
   }

   // No multiplier found â€” just parse the raw number
   const cleaned = viewStr.replace(/[^0-9.,]/g, '');
   if (!cleaned) return null;
   const numStr = cleaned.replace(/[.,]/g, '');
   const num = parseInt(numStr, 10);
   return isNaN(num) ? null : num;
}

/**
 * Parse a localized number string to float.
 * Handles: "1.200.000" (Indo thousands), "19,9" (Indo decimal),
 *          "1,200,000" (EN thousands), "1.2" (EN decimal).
 */
function parseNumberString(cleaned) {
   const dotCount   = (cleaned.match(/\./g) || []).length;
   const commaCount = (cleaned.match(/,/g) || []).length;

   let numStr = cleaned;

   if (dotCount >= 2 && commaCount === 0) {
      // "1.200.000" â†’ dots are thousand separators (Indo/DE)
      numStr = cleaned.replace(/\./g, '');
   } else if (commaCount >= 2 && dotCount === 0) {
      // "1,200,000" â†’ commas are thousand separators (EN/US)
      numStr = cleaned.replace(/,/g, '');
   } else if (dotCount === 1 && commaCount === 0) {
      // Ambiguous single dot: "1.2" (decimal) vs "1.200" (thousand)
      // Heuristic: if 3 digits after dot â†’ thousand sep; otherwise â†’ decimal
      const afterDot = cleaned.split('.')[1] || '';
      if (afterDot.length === 3) {
         numStr = cleaned.replace(/\./g, '');
      } else {
         // Keep dot as decimal
         numStr = cleaned;
      }
   } else if (commaCount === 1 && dotCount === 0) {
      // Ambiguous single comma: "19,9" (Indo decimal) vs "1,234" (EN thousand)
      const afterComma = cleaned.split(',')[1] || '';
      if (afterComma.length === 3) {
         numStr = cleaned.replace(/,/g, '');
      } else {
         // Keep comma as decimal â†’ convert to dot
         numStr = cleaned.replace(',', '.');
      }
   } else if (dotCount === 1 && commaCount === 1) {
      // Mixed: "19,9.000" or "1,200.5"
      if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
         // Indo: "19,9.000" â†’ comma is decimal, dots are thousands
         numStr = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
         // EN: "1,200.5" â†’ commas are thousands, dot is decimal
         numStr = cleaned.replace(/,/g, '');
      }
   } else {
      // No separators or multiple of both â€” just strip everything
      numStr = cleaned.replace(/[.,]/g, '');
   }

   const num = parseFloat(numStr);
   return isNaN(num) ? null : num;
}

/**
 * Safely extract text from a cheerio-style runs array.
 */
function extractRunsText(runs, filterEmpty = false) {
   if (!Array.isArray(runs)) return null;
   const filtered = filterEmpty ? runs.filter(r => r.text) : runs;
   return filtered.map(r => r.text).join('') || null;
}

/**
 * Safely get nested property with optional fallback.
 */
function get(obj, ...path) {
   let current = obj;
   for (const key of path) {
      if (current == null) return undefined;
      current = current[key];
   }
   return current;
}

/**
 * Safely pop the last thumbnail from a thumbnails array, preferring https URLs.
 */
function getBestThumbnail(thumbnails) {
   if (!Array.isArray(thumbnails) || thumbnails.length === 0) return null;
   const filtered = thumbnails.filter(t => t.url);
   if (filtered.length === 0) return null;
   // Return the last (highest resolution) thumbnail
   return filtered[filtered.length - 1].url;
}

/**
 * Normalize URL to ensure it has https:// prefix.
 */
function normalizeUrl(url) {
   if (!url) return null;
   if (url.startsWith('//')) return 'https:' + url;
   if (url.startsWith('http://') || url.startsWith('https://')) return url;
   return 'https://' + url;
}

/**
 * Extract ytInitialData JSON from the HTML page.
 * Uses a for loop so we can break early once found.
 */
function extractYtInitialData(html) {
   const $ = cheerio.load(html);
   const scriptTags = $('script').toArray();

   for (const tag of scriptTags) {
      const content = $(tag).html();
      if (!content || !content.includes('var ytInitialData = ')) continue;

      const startIndex = content.indexOf('var ytInitialData = ') + 'var ytInitialData = '.length;
      const jsonStr = content.substring(startIndex).replace(/;$/, '').trim();
      try {
         return JSON.parse(jsonStr);
      } catch (e) {
         // Try to find the balanced closing brace
         let depth = 0;
         let end = -1;
         for (let i = 0; i < jsonStr.length; i++) {
            if (jsonStr[i] === '{') depth++;
            else if (jsonStr[i] === '}') depth--;
            if (depth === 0) { end = i + 1; break; }
         }
         if (end > 0) {
            try {
               return JSON.parse(jsonStr.substring(0, end));
            } catch (_) {
               // Give up on this script tag
            }
         }
      }
   }
   return null;
}

/**
 * Extract video badges (e.g., "BARU", "CC", "4K", "LIVE").
 */
function extractBadges(badges) {
   if (!Array.isArray(badges) || badges.length === 0) return [];
   return badges
      .map(b => b.metadataBadgeRenderer)
      .filter(Boolean)
      .map(b => get(b, 'accessibilityData', 'label') || b.label || b.style || '')
      .filter(Boolean);
}

/**
 * Check if a video is currently live.
 */
function isLiveVideo(result) {
   const overlay = (result.thumbnailOverlays || []).find(
      o => 'thumbnailOverlayTimeStatusRenderer' in o
   );
   if (!overlay) return false;
   const status = get(overlay, 'thumbnailOverlayTimeStatusRenderer', 'style');
   return status === 'LIVE';
}

/**
 * Check if a video has "UPCOMING" status.
 */
function isUpcomingVideo(result) {
   const overlay = (result.thumbnailOverlays || []).find(
      o => 'thumbnailOverlayTimeStatusRenderer' in o
   );
   if (!overlay) return false;
   const status = get(overlay, 'thumbnailOverlayTimeStatusRenderer', 'style');
   return status === 'UPCOMING';
}

/**
 * Parse a single videoRenderer object into a clean result object.
 */
function parseVideo(result) {
   const videoId = result.videoId;
   if (!videoId) return null;

   const live = isLiveVideo(result);
   const upcoming = isUpcomingVideo(result);

   // Duration
   const lengthText = get(result, 'lengthText', 'simpleText');
   const overlayDuration = (() => {
      const overlay = (result.thumbnailOverlays || []).find(
         o => 'thumbnailOverlayTimeStatusRenderer' in o
      );
      return get(overlay, 'thumbnailOverlayTimeStatusRenderer', 'text', 'simpleText');
   })();
   const durationStr = lengthText || overlayDuration || null;
   const durationS = parseDuration(durationStr);
   const durationH = (() => {
      const overlay = (result.thumbnailOverlays || []).find(
         o => 'thumbnailOverlayTimeStatusRenderer' in o
      );
      return get(overlay, 'thumbnailOverlayTimeStatusRenderer', 'text', 'accessibilityData', 'accessibilityData', 'label') ||
             get(result, 'lengthText', 'accessibilityData', 'accessibilityData', 'label') ||
             null;
   })();

   // View count
   const viewSimpleText = get(result, 'viewCountText', 'simpleText');
   const viewShortText = get(result, 'shortViewCountText', 'simpleText');
   const viewAccessibilityLabel = get(result, 'shortViewCountText', 'accessibilityData', 'accessibilityData', 'label');
   const viewH = viewSimpleText || viewShortText || viewAccessibilityLabel || null;

   // Title
   const titleRuns = get(result, 'title', 'runs');
   let title = null;
   if (Array.isArray(titleRuns)) {
      const found = titleRuns.find(r => r.text);
      title = found ? found.text.trim() : null;
   }
   if (!title) {
      title = get(result, 'title', 'accessibilityData', 'accessibilityData', 'label');
      if (title) title = title.trim();
   }

   // Author / Channel
   const ownerRuns = get(result, 'ownerText', 'runs') || get(result, 'longBylineText', 'runs') || [];
   const authorRun = ownerRuns.find(r => r.text && r.text.trim()) || ownerRuns[0];
   const authorName = authorRun ? authorRun.text.trim() : null;

   // Channel ID
   let channelId = null;
   const navigationEndpoint = authorRun ? get(authorRun, 'navigationEndpoint') : null;
   if (navigationEndpoint) {
      channelId = get(navigationEndpoint, 'browseEndpoint', 'browseId');
   }
   // Fallback from longBylineText
   if (!channelId) {
      const longRuns = get(result, 'longBylineText', 'runs') || [];
      const longRun = longRuns.find(r => r.text);
      if (longRun) {
         channelId = get(longRun, 'navigationEndpoint', 'browseEndpoint', 'browseId');
      }
   }

   // Author Avatar
   const avatarThumbnails = get(result, 'channelThumbnailSupportedRenderers', 'channelThumbnailWithLinkRenderer', 'thumbnail', 'thumbnails');
   const authorAvatar = normalizeUrl(getBestThumbnail(avatarThumbnails));

   // Thumbnail
   const thumbnail = getBestThumbnail(get(result, 'thumbnail', 'thumbnails'));

   // Description
   const snippetRuns = get(result, 'detailedMetadataSnippets', '0', 'snippetText', 'runs');
   const description = snippetRuns ? extractRunsText(snippetRuns, true) : null;

   // Published time
   const publishedTime = get(result, 'publishedTimeText', 'simpleText');

   // Badges
   const badges = extractBadges(get(result, 'badges') || []);

   // Published date text
   const publishedDateText = get(result, 'publishedTimeText', 'simpleText');

   return {
      type: 'video',
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title,
      thumbnail,
      description,
      author: {
         name: authorName,
         id: channelId,
         avatar: authorAvatar,
         url: channelId ? `https://www.youtube.com/channel/${channelId}` : null
      },
      publishedTime,
      duration: {
         raw: durationStr,
         seconds: durationS,
         human: live ? 'SEDANG TAYANG' : (upcoming ? 'SEGERA HADIR' : formatDurationID(durationS)),
         accessibility: durationH
      },
      views: {
         raw: viewH,
         count: parseViewCount(viewH)
      },
      isLive: live,
      isUpcoming: upcoming,
      badges
   };
}

/**
 * Parse a single channelRenderer object into a clean result object.
 */
function parseChannel(result) {
   const channelId = result.channelId;
   if (!channelId) return null;

   // Channel Name
   const titleSimple = get(result, 'title', 'simpleText');
   const shortBylineRuns = get(result, 'shortBylineText', 'runs');
   let channelName = titleSimple;
   if (!channelName && Array.isArray(shortBylineRuns)) {
      const found = shortBylineRuns.find(r => r.text);
      channelName = found ? found.text.trim() : null;
   }

   // Avatar
   const avatar = normalizeUrl(getBestThumbnail(get(result, 'thumbnail', 'thumbnails')));

   // Subscriber count & Video count
   // NOTE: YouTube mobile search is inconsistent â€” "videoCountText" often contains
   // subscriber info (e.g., "19,9 jt subscriber") while "subscriberCountText" may
   // contain the channel handle (e.g., "@WindahBasudara"). We detect by keyword.
   const videoCountText = get(result, 'videoCountText', 'simpleText') || '';
   const subscriberCountText = get(result, 'subscriberCountText', 'simpleText') || '';
   const subscriberCountLabel = get(result, 'subscriberCountText', 'accessibilityData', 'accessibilityData', 'label') || '';

   // Collect all candidate strings
   const candidates = [videoCountText, subscriberCountText, subscriberCountLabel].filter(Boolean);

   let subscriberH = null;
   let videoCountH = null;

   for (const c of candidates) {
      const lower = c.toLowerCase();
      if (!subscriberH && /subscriber|pelanggan/.test(lower)) {
         subscriberH = c;
      } else if (!videoCountH && /video/.test(lower)) {
         videoCountH = c;
      }
   }

   // Fallback: if no keyword match, use numeric heuristics
   if (!subscriberH) {
      // Prefer the field whose name suggests subscriber count, then videoCountText
      if (/^\d/.test(subscriberCountText)) subscriberH = subscriberCountText;
      else if (/^\d/.test(videoCountText)) subscriberH = videoCountText;
      else if (/^\d/.test(subscriberCountLabel)) subscriberH = subscriberCountLabel;
   }

   // Extract handle from subscriberCountText if it looks like a handle
   let handle = null;
   for (const c of candidates) {
      if (/^@\w/.test(c)) { handle = c; break; }
   }

   // Verified badge
   const ownerBadges = get(result, 'ownerBadges') || [];
   const isVerified = ownerBadges.some(b =>
      get(b, 'metadataBadgeRenderer', 'style') === 'BADGE_STYLE_TYPE_VERIFIED' ||
      get(b, 'metadataBadgeRenderer', 'tooltip') === 'Terverifikasi' ||
      get(b, 'metadataBadgeRenderer', 'tooltip') === 'Verified'
   );

   // Description
   const descRuns = get(result, 'descriptionSnippet', 'runs');
   const description = descRuns ? extractRunsText(descRuns, true) : null;

   return {
      type: 'channel',
      channelId,
      url: `https://www.youtube.com/channel/${channelId}`,
      channelName,
      handle,
      avatar,
      isVerified,
      subscriber: {
         raw: subscriberH,
         count: parseViewCount(subscriberH)
      },
      videoCount: videoCountH || null,
      description
   };
}

/**
 * Parse a single radioRenderer (mix/playlist) object into a clean result object.
 */
function parseMix(result) {
   const playlistId = result.playlistId;
   if (!playlistId) return null;

   const title = get(result, 'title', 'simpleText');
   const thumbnail = getBestThumbnail(get(result, 'thumbnail', 'thumbnails'));

   // Parse videos in the mix
   const videos = (result.videos || []).map(v => {
      const child = v.childVideoRenderer;
      if (!child) return null;
      const vid = child.videoId;
      const childDurationStr = get(child, 'lengthText', 'simpleText');
      const childDurationAccessLabel = get(child, 'lengthText', 'accessibilityData', 'accessibilityData', 'label');
      return {
         videoId: vid,
         url: `https://www.youtube.com/watch?v=${vid}&list=${playlistId}`,
         title: get(child, 'title', 'simpleText'),
         duration: {
            raw: childDurationStr,
            human: formatDurationID(parseDuration(childDurationStr)),
            accessibility: childDurationAccessLabel
         }
      };
   }).filter(Boolean);

   return {
      type: 'mix',
      playlistId,
      url: `https://www.youtube.com/watch?v=${videos[0]?.videoId || ''}&list=${playlistId}`,
      title,
      thumbnail,
      videoCount: videos.length,
      videos
   };
}

/**
 * Main: Search YouTube and return structured results.
 *
 * @param {string} query - Search query
 * @param {object} [options] - Optional settings
 * @param {string} [options.type] - Filter type: 'all', 'video', 'channel', 'playlist'
 * @param {number} [options.limit] - Max results per category (default: no limit)
 * @returns {Promise<{video: object[], channel: object[], playlist: object[], query: string}>}
 */
function YoutubeSearch(query, options = {}) {
   return new Promise(async (resolve, reject) => {
      if (!query || typeof query !== 'string') {
         return reject(new Error('Query harus berupa string yang tidak kosong.'));
      }

      const { type = 'all', limit } = options;
      const encodedQuery = encodeURIComponent(query);

      try {
         const { data } = await axios.get(`https://m.youtube.com/results?search_query=${encodedQuery}`, {
            method: 'GET',
            headers: {
               'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
               'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
               'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            timeout: 15000
         });

         const ytData = extractYtInitialData(data);
         if (!ytData) {
            return reject(new Error('Gagal mengekstrak ytInitialData dari halaman. Mungkin YouTube mengubah strukturnya atau IP diblokir.'));
         }

         const contents = get(ytData, 'contents', 'twoColumnSearchResultsRenderer', 'primaryContents', 'sectionListRenderer', 'contents');
         if (!Array.isArray(contents) || contents.length === 0) {
            return reject(new Error('Tidak ditemukan hasil pencarian. Struktur halaman mungkin telah berubah.'));
         }

         const results = { video: [], channel: [], playlist: [] };

         for (const section of contents) {
            const sectionContents = get(section, 'itemSectionRenderer', 'contents');
            if (!Array.isArray(sectionContents)) continue;

            for (const item of sectionContents) {
               const typeName = Object.keys(item)[0];
               if (!typeName) continue;

               // Skip non-result types
               if (['horizontalCardListRenderer', 'shelfRenderer', 'promotedVideoRenderer', 'adSlotRenderer'].includes(typeName)) {
                  continue;
               }

               const parsed = item[typeName];
               if (!parsed) continue;

               try {
                  if (typeName === 'videoRenderer') {
                     if (type !== 'all' && type !== 'video') continue;
                     const video = parseVideo(parsed);
                     if (video) {
                        results.video.push(video);
                        if (limit && results.video.length >= limit) break;
                     }
                  } else if (typeName === 'channelRenderer') {
                     if (type !== 'all' && type !== 'channel') continue;
                     const channel = parseChannel(parsed);
                     if (channel) {
                        results.channel.push(channel);
                        if (limit && results.channel.length >= limit) break;
                     }
                  } else if (typeName === 'radioRenderer') {
                     if (type !== 'all' && type !== 'playlist') continue;
                     const mix = parseMix(parsed);
                     if (mix) {
                        results.playlist.push(mix);
                        if (limit && results.playlist.length >= limit) break;
                     }
                  }
               } catch (parseErr) {
                  // Skip individual items that fail to parse, don't crash the whole search
                  console.warn(`[YouTubeSearch] Gagal parse ${typeName}: ${parseErr.message}`);
               }
            }

            // Check if all categories reached their limits
            const allLimited = (['video', 'channel', 'playlist'].every(cat => {
               if (type !== 'all' && type !== cat) return true; // Not requested
               return limit && results[cat].length >= limit;
            }));
            if (allLimited) break;
         }

         resolve({
            query,
            ...results
         });

      } catch (error) {
         if (error.response) {
            const status = error.response.status;
            if (status === 429) {
               reject(new Error('Terlalu banyak permintaan (429). Coba lagi setelah beberapa saat.'));
            } else if (status === 403) {
               reject(new Error('Akses ditolak (403). YouTube mungkin memblokir permintaan ini.'));
            } else {
               reject(new Error(`HTTP Error ${status}: ${error.response.statusText}`));
            }
         } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            reject(new Error('Permintaan timeout. Periksa koneksi internet Anda.'));
         } else if (error.code === 'ENOTFOUND') {
            reject(new Error('Tidak dapat terhubung ke YouTube. Periksa koneksi internet.'));
         } else {
            reject(error);
         }
      }
   });
}

module.exports = YoutubeSearch;
