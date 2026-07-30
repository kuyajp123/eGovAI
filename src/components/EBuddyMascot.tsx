import type { ImgHTMLAttributes } from 'react'

type EBuddyMascotProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'>

const EBuddyMascot = ({
  alt = 'eBuddy AI assistant mascot',
  className = '',
  ...props
}: EBuddyMascotProps) => (
  <img
    src="/e%20mascot.png"
    alt={alt}
    className={`object-contain ${className}`.trim()}
    {...props}
  />
)

export default EBuddyMascot
