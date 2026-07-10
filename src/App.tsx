import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import gsap from "gsap";
import Lenis from "lenis";

const journeyLines = [
  "Some journeys begin with laughter.",
  "Some end in silence.",
  "Ours wasn't just a journey.",
  "It was a beautiful bond.",
];

const memories = [
  {
    title: "Happy Moments",
    text: "There were days when your words made the classroom feel lighter, and learning felt less like pressure and more like possibility.",
  },
  {
    title: "Unexpected Distance",
    text: "Some chapters became quiet. Still, even distance taught me the value of patience, maturity, and respect.",
  },
  {
    title: "Silent Lessons",
    text: "Not every lesson was written on a board. Some were hidden in the way you carried kindness, discipline, and dignity.",
  },
  {
    title: "New Turning Point",
    text: "And somehow, those memories became a turning point, reminding me to become better, softer, and more sincere.",
  },
];

const birthdayMessage = [
  "Dear Teacher, on this special day, I want to pause the noise of life for a moment and say something from the heart.",
  "You may not realize how many lives you have changed simply by being present, patient, and sincere. For me, your guidance became more than teaching. It became a quiet source of strength.",
  "There were moments I laughed, moments I learned, moments I misunderstood, and moments I understood only later. But through all of it, my respect for you remained.",
  "Thank you for the lessons, the memories, the correction, the kindness, and the inspiration. Thank you for being one of those people a student remembers long after the classroom becomes a memory.",
  "May Allah bless your life with peace, health, happiness, barakah, and beautiful days ahead. May every prayer you make return to you in ways more beautiful than you imagined.",
];

const blessings = [
  "May your days be filled with peace.",
  "May your heart always stay light.",
  "May your efforts be rewarded beautifully.",
  "May your life be blessed with barakah and duas.",
];

const sceneNotes = [
  "The little star walks with you.",
  "The moon listens quietly.",
  "Memories open like small windows.",
  "The words slow down here.",
  "The final light is waiting.",
];

type CompanionMood = "curious" | "walking" | "quiet" | "praying" | "celebrate";

type Ripple = {
  id: number;
  x: number;
  y: number;
};

type IntroPhase = "welcome" | "loading" | "story";

type CatMood = "calm" | "focus" | "confused" | "excited" | "loading";

const loadingMessages = [
  "✨ Preparing your surprise...",
  "🎂 Wrapping beautiful memories...",
  "🌙 Collecting quiet wishes...",
  "💖 Adding a little magic...",
  "🎁 Almost ready...",
];

const narrationText = [
  "A small surprise for someone who changed my life without even realizing it.",
  ...journeyLines,
  ...birthdayMessage,
  "Before the final words, only prayers.",
  ...blessings,
  "No matter where life takes us, you will always be one of the people I will respect, remember, and sincerely pray for.",
  "Happy Birthday, Teacher. With heartfelt respect, gratitude, and duas, Your Best Student.",
].join(" ");

function useIsReducedExperience() {
  const prefersReducedMotion = useReducedMotion();
  const [isReduced, setIsReduced] = useState(Boolean(prefersReducedMotion));

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const lowCoreCount = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : false;
    const lowMemory = memory ? memory <= 4 : false;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    setIsReduced(Boolean(prefersReducedMotion || connection?.saveData || lowCoreCount || lowMemory || coarsePointer));
  }, [prefersReducedMotion]);

  return isReduced;
}

function useAmbientAudio() {
  const contextRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<Array<AudioNode & { stop?: () => void }>>([]);
  const [enabled, setEnabled] = useState(false);

  const stop = () => {
    nodesRef.current.forEach((node) => node.stop?.());
    nodesRef.current = [];
    contextRef.current?.close();
    contextRef.current = null;
  };

  const start = () => {
    const AudioCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    const master = ctx.createGain();
    master.gain.value = 0.045;
    master.connect(ctx.destination);

    const notes = [261.63, 329.63, 392, 523.25];
    notes.forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.value = index === 0 ? 0.32 : 0.12;
      osc.connect(gain);
      gain.connect(master);
      osc.start(ctx.currentTime + index * 0.45);
      nodesRef.current.push(osc);
    });

    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * 0.16;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 520;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.11;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();
    nodesRef.current.push(noise);
    contextRef.current = ctx;
  };

  useEffect(() => stop, []);

  const toggle = () => {
    if (enabled) {
      stop();
      setEnabled(false);
    } else {
      start();
      setEnabled(true);
    }
  };

  return { enabled, toggle };
}

function useNarration() {
  const [isNarrating, setIsNarrating] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsSupported("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const toggle = () => {
    if (!isSupported) return;

    if (isNarrating) {
      window.speechSynthesis.cancel();
      setIsNarrating(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(narrationText);
    utterance.rate = 0.82;
    utterance.pitch = 0.92;
    utterance.volume = 0.72;
    utterance.onend = () => setIsNarrating(false);
    utterance.onerror = () => setIsNarrating(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsNarrating(true);
  };

  return { isNarrating, isSupported, toggle };
}

function TypewriterLines() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (active >= journeyLines.length - 1) return undefined;
    const timeout = window.setTimeout(() => setActive((value) => value + 1), 2100);
    return () => window.clearTimeout(timeout);
  }, [active]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 text-center">
      {journeyLines.map((line, index) => (
        <motion.p
          key={line}
          initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
          animate={index <= active ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="type-line font-display text-3xl leading-tight text-white sm:text-5xl"
        >
          {line}
        </motion.p>
      ))}
    </div>
  );
}

function StoryCue({ progress }: { progress: number }) {
  const index = Math.min(sceneNotes.length - 1, Math.floor(progress * sceneNotes.length));

  return (
    <motion.div
      aria-hidden="true"
      className="story-cue fixed bottom-5 left-1/2 z-40 hidden -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-[0.65rem] uppercase tracking-[0.22em] text-mist/80 backdrop-blur-xl sm:flex"
      animate={{ opacity: progress > 0.06 && progress < 0.9 ? 1 : 0, y: progress > 0.06 ? 0 : 10 }}
      transition={{ duration: 0.6 }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_18px_rgba(212,175,55,0.8)]" />
      {sceneNotes[index]}
    </motion.div>
  );
}

function AmbientLayers({ reduced = false }: { reduced?: boolean }) {
  const [backgroundUrl, setBackgroundUrl] = useState("");

  useEffect(() => {
    let isMounted = true;
    import("../assets/moonlit-letter-bg.jpg").then((asset) => {
      if (isMounted) setBackgroundUrl(asset.default);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const stars = useMemo(
    () =>
      Array.from({ length: reduced ? 36 : 90 }, (_, index) => ({
        id: index,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 8}s`,
        size: `${Math.random() * 2.2 + 0.7}px`,
        opacity: Math.random() * 0.55 + 0.18,
      })),
    [reduced],
  );
  const fireflies = useMemo(
    () =>
      Array.from({ length: reduced ? 8 : 22 }, (_, index) => ({
        id: index,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 12}s`,
        duration: `${10 + Math.random() * 10}s`,
      })),
    [reduced],
  );
  const drifters = useMemo(
    () =>
      Array.from({ length: reduced ? 4 : 12 }, (_, index) => ({
        id: index,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 16}s`,
        duration: `${18 + Math.random() * 16}s`,
      })),
    [reduced],
  );

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {backgroundUrl ? (
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-55"
          src={backgroundUrl}
          alt=""
          decoding="async"
          fetchPriority="low"
        />
      ) : null}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_15%,rgba(212,175,55,0.13),transparent_24%),linear-gradient(180deg,rgba(5,8,22,0.18),#050816_86%)]" />
      <div className="star-drift absolute inset-0">
        {stars.map((star) => (
          <span
            key={star.id}
            className="star"
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              animationDelay: star.delay,
              opacity: star.opacity,
            }}
          />
        ))}
      </div>
      <div className="absolute left-1/2 top-24 h-56 w-56 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl sm:left-[70%] sm:top-10 sm:h-80 sm:w-80" />
      <div className="light-ray absolute right-0 top-0 h-[75vh] w-[42vw] bg-gold/10 blur-3xl" />
      <div className="cloud cloud-one" />
      <div className="cloud cloud-two" />
      {fireflies.map((firefly) => (
        <span
          key={firefly.id}
          className="firefly"
          style={{
            left: firefly.left,
            top: firefly.top,
            animationDelay: firefly.delay,
            animationDuration: firefly.duration,
          }}
        />
      ))}
      {drifters.map((drifter) => (
        <span
          key={drifter.id}
          className="leaf-drift"
          style={{
            left: drifter.left,
            animationDelay: drifter.delay,
            animationDuration: drifter.duration,
          }}
        />
      ))}
      {!reduced ? (
        <>
          <span className="shooting-star shooting-star-one" />
          <span className="shooting-star shooting-star-two" />
        </>
      ) : null}
    </div>
  );
}

function InteractiveConstellation({ reduced = false }: { reduced?: boolean }) {
  const stars = useMemo(
    () => [
      { left: "10%", top: "26%", size: 18 },
      { left: "18%", top: "70%", size: 13 },
      { left: "83%", top: "34%", size: 16 },
      { left: "76%", top: "78%", size: 12 },
      { left: "47%", top: "18%", size: 10 },
    ],
    [],
  );

  if (reduced) return null;

  return (
    <div aria-hidden="true" className="fixed inset-0 z-20 overflow-hidden">
      {stars.map((star, index) => (
        <button
          key={index}
          type="button"
          tabIndex={-1}
          className="interactive-star"
          style={{ left: star.left, top: star.top, width: star.size, height: star.size }}
        />
      ))}
    </div>
  );
}

function CursorGlow() {
  const x = useMotionValue(-120);
  const y = useMotionValue(-120);
  const smoothX = useSpring(x, { stiffness: 80, damping: 24 });
  const smoothY = useSpring(y, { stiffness: 80, damping: 24 });

  useEffect(() => {
    const move = (event: PointerEvent) => {
      x.set(event.clientX - 140);
      y.set(event.clientY - 140);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [x, y]);

  return <motion.div aria-hidden="true" className="cursor-glow" style={{ x: smoothX, y: smoothY }} />;
}

function Companions({ mood, pulse }: { mood: CompanionMood; pulse: number }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 35, damping: 18 });
  const smoothY = useSpring(y, { stiffness: 35, damping: 18 });
  const isCelebrating = mood === "celebrate";
  const isQuiet = mood === "quiet" || mood === "praying";

  useEffect(() => {
    const move = (event: PointerEvent) => {
      x.set((event.clientX - window.innerWidth / 2) / 30);
      y.set((event.clientY - window.innerHeight / 2) / 38);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [x, y]);

  return (
    <motion.div
      aria-hidden="true"
      className={`companions ${mood}`}
      style={{ x: smoothX, y: smoothY }}
      animate={pulse ? { scale: [1, 1.08, 1], rotate: [0, -2, 2, 0] } : {}}
      transition={{ duration: 0.75, ease: "easeOut" }}
    >
      <motion.div
        className="moon-friend"
        animate={{
          y: isQuiet ? [0, 4, 0] : [0, -9, 0],
          rotate: isCelebrating ? [0, 7, -7, 0] : [0, 2, -1, 0],
        }}
        transition={{ duration: isCelebrating ? 1.8 : 5.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="moon-eye left" />
        <span className="moon-eye right" />
        <span className="moon-smile" />
        <span className="moon-cheek" />
      </motion.div>
      <motion.div
        className="star-friend"
        animate={{
          x: mood === "walking" ? [-9, 9, -9] : [0, 5, 0],
          y: isCelebrating ? [0, -16, 0] : [0, -7, 0],
          rotate: isCelebrating ? [0, 14, -14, 0] : [0, -6, 6, 0],
        }}
        transition={{ duration: isCelebrating ? 1.15 : 3.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="star-face" />
        <span className="star-arm" />
        <span className="star-shadow" />
      </motion.div>
    </motion.div>
  );
}

function ClickRipples({ ripples }: { ripples: Ripple[] }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {ripples.map((ripple) => (
        <span key={ripple.id} className="click-ripple" style={{ left: ripple.x, top: ripple.y }} />
      ))}
    </div>
  );
}

function RevealText({ children, className = "" }: { children: string; className?: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 36, filter: "blur(12px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-18% 0px" }}
      transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.p>
  );
}

function MessageScene({ paragraph, index }: { paragraph: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 0.5, 1], [42, 0, -34]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.82, 1], [0.18, 1, 1, 0.32]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.97, 1, 0.98]);

  return (
    <motion.article ref={ref} style={{ y, opacity, scale }} className="message-scene">
      <span className="message-index">{String(index + 1).padStart(2, "0")}</span>
      <RevealText className="font-display text-3xl leading-snug text-white/92 sm:text-5xl">
        {paragraph}
      </RevealText>
    </motion.article>
  );
}

function MemoryCard({ memory, index }: { memory: (typeof memories)[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [48, -48]);

  return (
    <motion.article
      ref={ref}
      style={{ y }}
      initial={{ opacity: 0, scale: 0.96, filter: "blur(14px)" }}
      whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.42 }}
      transition={{ duration: 1, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="memory-card"
    >
      <span className="memory-orbit" />
      <span className="font-body text-xs uppercase tracking-[0.32em] text-gold/75">Chapter {index + 1}</span>
      <h3 className="mt-5 font-display text-4xl text-white sm:text-5xl">{memory.title}</h3>
      <p className="mt-5 text-base leading-8 text-mist sm:text-lg">{memory.text}</p>
    </motion.article>
  );
}

function CelebrationScene() {
  return (
    <div aria-hidden="true" className="celebration-scene">
      <div className="balloon balloon-one" />
      <div className="balloon balloon-two" />
      <div className="balloon balloon-three" />
      <div className="firework firework-one" />
      <div className="firework firework-two" />
      <div className="cake">
        <span className="cake-flame" />
        <span className="cake-top" />
        <span className="cake-base" />
      </div>
      <div className="heart heart-one" />
      <div className="heart heart-two" />
      <div className="heart heart-three" />
    </div>
  );
}

function OpeningCat({ mood = "calm" }: { mood?: CatMood }) {
  const eyeX = useMotionValue(0);
  const eyeY = useMotionValue(0);
  const smoothEyeX = useSpring(eyeX, { stiffness: 90, damping: 18 });
  const smoothEyeY = useSpring(eyeY, { stiffness: 90, damping: 18 });

  useEffect(() => {
    const move = (event: PointerEvent) => {
      eyeX.set((event.clientX - window.innerWidth / 2) / 95);
      eyeY.set((event.clientY - window.innerHeight / 2) / 110);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [eyeX, eyeY]);

  return (
    <motion.div
      aria-hidden="true"
      className={`opening-cat ${mood}`}
      animate={
        mood === "excited" || mood === "loading"
          ? { y: [0, -18, 0], rotate: [0, -3, 3, 0] }
          : { y: [0, -4, 0], rotate: [0, -1, 1, 0] }
      }
      transition={{ duration: mood === "excited" || mood === "loading" ? 0.72 : 4.8, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="cat-tail" />
      <span className="cat-body" />
      <span className="cat-head">
        <span className="cat-ear left" />
        <span className="cat-ear right" />
        <span className="cat-face">
          <span className="cat-eye left">
            <motion.span style={{ x: smoothEyeX, y: smoothEyeY }} />
          </span>
          <span className="cat-eye right">
            <motion.span style={{ x: smoothEyeX, y: smoothEyeY }} />
          </span>
          <span className="cat-nose" />
          <span className="cat-mouth" />
          <span className="cat-whisker whisker-one" />
          <span className="cat-whisker whisker-two" />
        </span>
      </span>
      <span className="cat-paw waving" />
      <span className="cat-paw resting" />
      <span className="cat-heart heart-a" />
      <span className="cat-heart heart-b" />
    </motion.div>
  );
}

function MagicalLoading({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    const duration = 5600;
    let frame = 0;
    let completeTimer = 0;

    const tick = (time: number) => {
      const next = Math.min(100, ((time - startedAt) / duration) * 100);
      setProgress(next);
      if (next < 100) {
        frame = window.requestAnimationFrame(tick);
      } else {
        completeTimer = window.setTimeout(onComplete, 850);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const message = loadingMessages[Math.min(loadingMessages.length - 1, Math.floor((progress / 100) * loadingMessages.length))];

  return (
    <motion.section
      className="intro-scene loading-scene"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, filter: "blur(14px)" }}
      transition={{ duration: 1 }}
    >
      <div aria-hidden="true" className="intro-gradient" />
      <div className="loading-center">
        <OpeningCat mood="loading" />
        <motion.div
          aria-hidden="true"
          className="magic-gift"
          animate={{ scale: [1, 1.05, 1], rotate: [0, -2, 2, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="gift-lid" />
          <span className="gift-box" />
          <span className="gift-spark one" />
          <span className="gift-spark two" />
          <span className="gift-spark three" />
        </motion.div>
        <motion.p
          key={message}
          initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.75 }}
          className="loading-message"
        >
          {message}
        </motion.p>
        <div className="magic-trail" role="progressbar" aria-label="Opening surprise" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <motion.span style={{ width: `${progress}%` }} />
        </div>
      </div>
    </motion.section>
  );
}

function OpeningScene({
  audioEnabled,
  onToggleAudio,
  onBeginLoading,
}: {
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onBeginLoading: () => void;
}) {
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [message, setMessage] = useState("");
  const [catMood, setCatMood] = useState<CatMood>("calm");
  const [hasError, setHasError] = useState(false);
  const resetTimerRef = useRef(0);
  const submitTimerRef = useRef(0);

  useEffect(
    () => () => {
      window.clearTimeout(resetTimerRef.current);
      window.clearTimeout(submitTimerRef.current);
    },
    [],
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !birthday) {
      setCatMood("confused");
      setHasError(true);
      setMessage("Oops! I need both your name and birthday before we continue.");
      resetTimerRef.current = window.setTimeout(() => setCatMood("calm"), 1900);
      return;
    }

    setCatMood("excited");
    setHasError(false);
    setMessage(`Beautiful, ${name.trim()}. Your surprise is opening now.`);
    submitTimerRef.current = window.setTimeout(onBeginLoading, 1050);
  };

  return (
    <motion.section
      className="intro-scene"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98, filter: "blur(12px)" }}
      transition={{ duration: 0.9 }}
    >
      <div aria-hidden="true" className="intro-gradient" />
      <div aria-hidden="true" className="intro-moon" />
      <div aria-hidden="true" className="intro-cloud intro-cloud-one" />
      <div aria-hidden="true" className="intro-cloud intro-cloud-two" />
      <div aria-hidden="true" className="intro-balloon intro-balloon-one" />
      <div aria-hidden="true" className="intro-balloon intro-balloon-two" />
      <div aria-hidden="true" className="intro-sparkle-field">
        {Array.from({ length: 36 }, (_, index) => (
          <span key={index} style={{ left: `${(index * 31) % 100}%`, top: `${(index * 47) % 100}%`, animationDelay: `${index * 0.21}s` }} />
        ))}
      </div>

      <button
        type="button"
        onClick={onToggleAudio}
        className="intro-audio"
        aria-pressed={audioEnabled}
        aria-label={audioEnabled ? "Mute ambient audio" : "Play ambient audio"}
      >
        {audioEnabled ? "Mute" : "Audio"}
      </button>

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 34, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <OpeningCat mood={catMood} />

        <div className="welcome-copy">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="welcome-kicker"
          >
            ✨ Welcome!
          </motion.p>
          <h1>A beautiful surprise is waiting for you...</h1>
          <p className="typewriter-welcome">Please enter your details to begin this unforgettable journey.</p>
        </div>

        <form className="story-form" onSubmit={submit} noValidate>
          <label className="floating-field" htmlFor="visitor-name">
            <span className="field-icon pencil-icon" aria-hidden="true" />
            <input
              id="visitor-name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onFocus={() => setCatMood("focus")}
              onBlur={() => setCatMood("calm")}
              placeholder="Enter your beautiful name"
              autoComplete="name"
              aria-invalid={hasError && !name.trim()}
              aria-describedby="login-message"
              required
            />
            <span className="floating-label">Name</span>
          </label>

          <label className="floating-field" htmlFor="visitor-birthday">
            <span className="field-icon cake-icon" aria-hidden="true" />
            <input
              id="visitor-birthday"
              name="birthday"
              type="date"
              value={birthday}
              onChange={(event) => setBirthday(event.target.value)}
              onFocus={() => setCatMood("focus")}
              onBlur={() => setCatMood("calm")}
              aria-label="Select your birthday"
              aria-invalid={hasError && !birthday}
              aria-describedby="login-message"
              required
            />
            <span className="floating-label">Date of Birth</span>
          </label>

          <motion.button
            type="submit"
            className="surprise-button"
            whileHover={{ y: -3, scale: 1.015 }}
            whileTap={{ scale: 0.96 }}
          >
            <span>🎁 Open My Surprise</span>
            <span aria-hidden="true" className="button-stars" />
          </motion.button>
        </form>

        <motion.p
          id="login-message"
          role={hasError ? "alert" : "status"}
          aria-live="polite"
          className="login-message"
          animate={{ opacity: message ? 1 : 0, y: message ? 0 : 8 }}
        >
          {message || "The cat is waiting patiently."}
        </motion.p>
      </motion.div>
    </motion.section>
  );
}

function App() {
  const { enabled, toggle } = useAmbientAudio();
  const narration = useNarration();
  const reducedExperience = useIsReducedExperience();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 28 });
  const [storyProgress, setStoryProgress] = useState(0);
  const [companionPulse, setCompanionPulse] = useState(0);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [introPhase, setIntroPhase] = useState<IntroPhase>("welcome");

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setStoryProgress(latest);
  });

  useEffect(() => {
    if (introPhase !== "story" || reducedExperience) return undefined;

    const lenis = new Lenis({ duration: 1.35, smoothWheel: true, wheelMultiplier: 0.82 });
    const ticker = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(ticker);
      lenis.destroy();
    };
  }, [introPhase, reducedExperience]);

  const begin = () => {
    setCompanionPulse((value) => value + 1);
    document.getElementById("journey")?.scrollIntoView({ behavior: "smooth" });
  };

  const mood: CompanionMood =
    storyProgress > 0.84
      ? "celebrate"
      : storyProgress > 0.68
        ? "praying"
        : storyProgress > 0.48
          ? "quiet"
          : storyProgress > 0.2
            ? "walking"
            : "curious";

  const addRipple = (event: React.PointerEvent<HTMLElement>) => {
    const ripple = { id: Date.now(), x: event.clientX, y: event.clientY };
    setRipples((current) => [...current.slice(-5), ripple]);
    window.setTimeout(() => {
      setRipples((current) => current.filter((item) => item.id !== ripple.id));
    }, 900);
  };

  if (introPhase === "welcome") {
    return (
      <OpeningScene
        audioEnabled={enabled}
        onToggleAudio={toggle}
        onBeginLoading={() => setIntroPhase("loading")}
      />
    );
  }

  if (introPhase === "loading") {
    return <MagicalLoading onComplete={() => setIntroPhase("story")} />;
  }

  return (
    <main onPointerDown={addRipple} className="relative min-h-screen overflow-x-hidden bg-midnight font-body text-white">
      <AmbientLayers reduced={reducedExperience} />
      <InteractiveConstellation reduced={reducedExperience} />
      {!reducedExperience ? <CursorGlow /> : null}
      <Companions mood={mood} pulse={companionPulse} />
      <ClickRipples ripples={ripples} />
      <StoryCue progress={storyProgress} />
      <motion.div className="fixed left-0 top-0 z-50 h-[2px] origin-left bg-gold" style={{ scaleX: progress }} />
      <button
        type="button"
        onClick={() => {
          setCompanionPulse((value) => value + 1);
          toggle();
        }}
        className="fixed right-4 top-4 z-40 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/80 backdrop-blur-xl transition hover:border-gold/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-gold/50"
        aria-pressed={enabled}
        aria-label={enabled ? "Mute ambient audio" : "Play ambient audio"}
      >
        {enabled ? "Mute" : "Audio"}
      </button>
      {narration.isSupported ? (
        <button
          type="button"
          onClick={narration.toggle}
          className="fixed right-4 top-16 z-40 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/80 backdrop-blur-xl transition hover:border-gold/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-gold/50"
          aria-pressed={narration.isNarrating}
          aria-label={narration.isNarrating ? "Stop voice narration" : "Start voice narration"}
        >
          {narration.isNarrating ? "Stop" : "Narrate"}
        </button>
      ) : null}

      <section className="relative z-10 flex min-h-screen items-center px-6 pb-24 pt-28">
        <motion.div
          aria-hidden="true"
          className="lantern lantern-hero"
          animate={{ y: [0, -16, 0], rotate: [-2, 2, -2] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="mx-auto max-w-5xl">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, delay: 0.2 }}
            className="mb-7 text-xs uppercase tracking-[0.38em] text-gold/80"
          >
            A small letter
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 46, filter: "blur(18px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl font-display text-5xl leading-[0.96] text-white sm:text-7xl lg:text-8xl"
          >
            A small surprise for someone who changed my life without even realizing it.
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 1.45 }}
            className="mt-12"
          >
            <button
              type="button"
              onClick={begin}
              className="group rounded-full border border-gold/45 bg-gold/10 px-8 py-4 text-sm font-medium uppercase tracking-[0.28em] text-white shadow-glow backdrop-blur-xl transition hover:bg-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/60"
            >
              Begin
              <span className="ml-4 inline-block transition group-hover:translate-x-1">→</span>
            </button>
          </motion.div>
        </div>
      </section>

      <section id="journey" className="story-section relative z-10 flex min-h-screen items-center py-28">
        <div aria-hidden="true" className="path-line" />
        <TypewriterLines />
      </section>

      <section className="relative z-10 px-6 py-28">
        <div className="mx-auto max-w-6xl">
          <RevealText className="mx-auto max-w-3xl text-center font-display text-5xl leading-tight text-white sm:text-7xl">
            Every memory became part of the person I am still becoming.
          </RevealText>
          <div className="mt-24 grid gap-6 md:grid-cols-2">
            {memories.map((memory, index) => (
              <MemoryCard key={memory.title} memory={memory} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="focus-section relative z-10 px-6 py-32">
        <div className="mx-auto max-w-3xl">
          <p className="mb-10 text-xs uppercase tracking-[0.34em] text-gold/80">The message</p>
          <div className="space-y-16">
            {birthdayMessage.map((paragraph) => (
              <MessageScene key={paragraph} paragraph={paragraph} index={birthdayMessage.indexOf(paragraph)} />
            ))}
          </div>
        </div>
      </section>

      <section className="anticipation-section relative z-10 overflow-hidden px-6 py-36 text-center">
        <motion.div
          aria-hidden="true"
          className="butterfly"
          animate={{ x: ["-10vw", "30vw", "84vw"], y: [30, -24, 16], rotate: [-8, 8, -4] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.h2
          initial={{ opacity: 0, scale: 0.92, filter: "blur(18px)" }}
          whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.45 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-4xl font-display text-5xl leading-tight text-white sm:text-7xl lg:text-8xl"
        >
          Before the final words, only prayers.
        </motion.h2>
        <div className="mx-auto mt-16 max-w-2xl space-y-5">
          {blessings.map((line, index) => (
            <motion.p
              key={line}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: index * 0.24 }}
              className="text-lg leading-8 text-mist sm:text-2xl"
            >
              {line}
            </motion.p>
          ))}
        </div>
      </section>

      <section className="final-section relative z-10 flex min-h-screen items-center overflow-hidden bg-black px-6 py-32">
        <div aria-hidden="true" className="confetti-field final-confetti">
          {Array.from({ length: 34 }, (_, index) => (
            <span key={index} style={{ left: `${(index * 29) % 100}%`, animationDelay: `${index * 0.38}s` }} />
          ))}
        </div>
        <CelebrationScene />
        <div className="mx-auto max-w-4xl text-center">
          <RevealText className="font-display text-4xl leading-tight text-white sm:text-6xl">
            No matter where life takes us, you will always be one of the people I will respect, remember, and sincerely pray for.
          </RevealText>
          <motion.h2
            initial={{ opacity: 0, scale: 0.9, filter: "blur(18px)" }}
            whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 1.45, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
            className="final-birthday mx-auto mt-16 max-w-5xl font-display text-6xl leading-none text-white sm:text-8xl lg:text-9xl"
          >
            Happy Birthday, Teacher
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.55 }}
            transition={{ duration: 1.3, delay: 1.7 }}
            className="mt-16 space-y-3 text-lg leading-8 text-mist sm:text-2xl"
          >
            <p>With heartfelt respect,</p>
            <p>gratitude,</p>
            <p>and duas,</p>
            <p className="pt-4 font-display text-4xl text-gold sm:text-5xl">Your Best Student.</p>
          </motion.div>
        </div>
      </section>
    </main>
  );
}

export default App;
