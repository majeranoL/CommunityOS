import { motion } from 'framer-motion'

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

const pageTransition = {
  type: 'tween' as const,
  ease: 'easeOut' as const,
  duration: 0.2,
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={pageTransition}
    >
      {children}
    </motion.div>
  )
}
