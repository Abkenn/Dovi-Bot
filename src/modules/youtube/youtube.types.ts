export type YouTubeChannelParams = {
  part: 'contentDetails';
  forHandle: string;
};

export type YouTubePlaylistParams = {
  part: 'contentDetails';
  playlistId: string;
  maxResults: number;
  pageToken?: string;
};

export type YouTubeVideoParams = {
  part: 'snippet,liveStreamingDetails';
  id: string;
};
