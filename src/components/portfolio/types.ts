export interface LoadedSection {
    path: string;      // portfolio/experience.md
    rel: string;       // experience.md (relative to portfolio/)
    slug: string;      // anchor id
    title: string;     // from first H1 or filename
    markdown: string;
    thumbnail?: string; // company logo, when provided by the manifest
}

