export type YouTubeUpload = {
  id: string;
  publishedAt: Date;
  url: string;
};

export type BuildYouTubeUploadAnnouncementInput = Pick<YouTubeUpload, 'url'> & {
  roleId: string;
};
