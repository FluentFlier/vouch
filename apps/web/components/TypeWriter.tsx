'use client';

import { useEffect, useState } from 'react';

interface TypeWriterProps {
  words: string[];
  className?: string;
}

export function TypeWriter({ words, className = '' }: TypeWriterProps) {
  const [index, setIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = words[index];
    const timeout = isDeleting ? 40 : 80;

    if (!isDeleting && charIndex === word.length) {
      setTimeout(() => setIsDeleting(true), 2000);
      return;
    }

    if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setIndex((i) => (i + 1) % words.length);
      return;
    }

    const timer = setTimeout(() => {
      setCharIndex((c) => c + (isDeleting ? -1 : 1));
    }, timeout);

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, index, words]);

  return (
    <span className={className}>
      {words[index].slice(0, charIndex)}
      <span className="animate-pulse text-vouch-green">|</span>
    </span>
  );
}
