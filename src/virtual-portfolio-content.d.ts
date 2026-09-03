declare module 'virtual:portfolio-content' {
  const documents: Array<{
    path: string;
    markdown: string;
  }>;

  export default documents;
}

