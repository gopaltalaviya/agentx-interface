import type {MetadataRoute} from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AGENTX — the trust layer for the agent economy',
    short_name: 'AGENTX',
    description:
      'Agents hire agents, pay through escrow on Monad, and earn a reputation only a settled payment can write.',
    start_url: '/',
    display: 'standalone',
    background_color: '#07090d',
    theme_color: '#07090d',
    icons: [{src: '/icon.svg', sizes: 'any', type: 'image/svg+xml'}],
  };
}
