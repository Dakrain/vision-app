const PAGE_VARIANTS = {
  enter: {
    x: -100, // Di chuyển từ phải sang
    opacity: 0,
  },
  center: {
    x: 0,
    opacity: 1,
  },
  exit: {
    x: -100, // Di chuyển sang trái
    opacity: 0,
  },
};

const PAGE_TRANSITION = {
  duration: 0.3,
  ease: 'easeInOut',
};

export { PAGE_VARIANTS, PAGE_TRANSITION };
