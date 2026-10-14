export interface PlatformBadge {
  className: string
  label: string
}

/**
 * Returns consistent branding and color styling for hackathon hosting platforms.
 */
export function getPlatformBadge(platform?: string | null): PlatformBadge {
  switch (platform?.toLowerCase()) {
    case 'unstop':
      return {
        className: 'bg-[#ff9800] text-[#10201d] border-[#10201d]',
        label: 'Unstop',
      }
    case 'devfolio':
      return {
        className: 'bg-[#3770ff] text-[#f7f7f2] border-[#10201d]',
        label: 'Devfolio',
      }
    case 'devpost':
      return {
        className: 'bg-[#0086bf] text-[#f7f7f2] border-[#10201d]',
        label: 'Devpost',
      }
    case 'mlh':
      return {
        className: 'bg-[#e53927] text-[#f7f7f2] border-[#10201d]',
        label: 'MLH',
      }
    case 'hackerearth':
      return {
        className: 'bg-[#2c3454] text-[#29c5b6] border-[#10201d]',
        label: 'HackerEarth',
      }
    case 'kaggle':
      return {
        className: 'bg-[#20beff] text-[#10201d] border-[#10201d]',
        label: 'Kaggle',
      }
    case 'internshala':
      return {
        className: 'bg-[#8bb2de] text-[#10201d] border-[#10201d]',
        label: 'Internshala',
      }
    default:
      return {
        className: 'bg-[#8bb2de] text-[#10201d] border-[#10201d]',
        label: platform || 'Hackathon',
      }
  }
}
