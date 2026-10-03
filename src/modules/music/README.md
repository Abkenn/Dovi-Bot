# Music history

`/music-search query:Been Good to Know Ya` is staging-only initially. It returns the best fuzzy match as three lines: latest stream with a timestamped YouTube hyperlink, total recorded plays, and an italic collector mention with notifications disabled. Missing or ambiguous videos show the recorded stream/date/time without a guessed link.

The parser, search, video lookup, and DAL are separate so an activity music tab can reuse the catalog. The complete source text is retained alongside parsed plays. Only the Per Stream history creates plays; the Per Game index enriches titles by stream ID and timestamp. Search tolerates spelling mistakes. Counts group normalized names (case, accents, punctuation, and word order); different arrangements or inconsistent source names are not automatically merged by fuzzy similarity.

## Updates

The MessageCreate listener accepts uploads only from `MUSIC_CATALOG_UPLOADER_ID` in the production guild. Accepted filenames are `32.0.txt` or `List Music Stream ... 32.0.txt` (any numeric major/minor version). No extra intents or permissions are required. The bot must be online and able to receive the message. It downloads up to 2 MB, validates the whole stream history, and atomically replaces its copy. Reuploading the same version with corrections works. Newer Discord messages win even when downloads complete out of order; a larger attachment ID breaks ties within one message. Malformed files leave the catalog untouched.

After replacement, the existing YouTube API key and primary channel handle resolve historical broadcasts by actual start date in São Paulo time. Links are persisted so commands need no YouTube network request. An API failure preserves music data and previously resolved links; refresh with the command below. A date without a unique public completed broadcast stays unlinked.

## Initial catalog setup

Load the initial catalog by sending its versioned text file through the authorized Discord upload flow described above. No local catalog copy or import script is tracked in the repository. Later uploads replace the stored source atomically, while malformed files leave the current catalog untouched.
