import type { PointerEvent, WheelEvent } from 'react';
import { useRef } from 'react';

const DRAG_CLICK_THRESHOLD_PX = 5;

export const useDragScroll = () => {
  const dragStart = useRef<{ pointerX: number; scrollLeft: number } | null>(
    null,
  );
  const dragged = useRef(false);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    dragStart.current = {
      pointerX: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
    };
    dragged.current = false;
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!dragStart.current) {
      return;
    }

    const distance = event.clientX - dragStart.current.pointerX;
    dragged.current = Math.abs(distance) >= DRAG_CLICK_THRESHOLD_PX;

    if (
      dragged.current &&
      !event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    event.currentTarget.scrollLeft = dragStart.current.scrollLeft - distance;
  };

  const onPointerEnd = (event: PointerEvent<HTMLElement>) => {
    dragStart.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onClickCapture = (event: PointerEvent<HTMLElement>) => {
    if (dragged.current) {
      event.preventDefault();
      event.stopPropagation();
    }
    dragged.current = false;
  };

  const onWheel = (event: WheelEvent<HTMLElement>) => {
    const horizontalDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;

    if (horizontalDelta === 0) {
      return;
    }

    event.currentTarget.scrollLeft += horizontalDelta;
    event.preventDefault();
  };

  return {
    onClickCapture,
    onPointerCancel: onPointerEnd,
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onWheel,
  };
};
