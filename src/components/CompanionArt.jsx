import { cn } from '../lib/utils.js';

const LEAF_COLORS = ['#7BC47F', '#A8CE8D', '#F4E4AE', '#F2B998'];

export function CompanionArt({
  type = 'bear',
  mood = 'ready',
  pose = 'idle',
  level = 1,
  companion,
  size = 280,
  faceOnly = false,
  glow = false,
  animated = true,
  className,
}) {
  const colors = companion?.colors || {
    fur: '#A9744F',
    furDark: '#825436',
    furLight: '#F0D6B8',
    inner: '#D89B78',
    scarf: '#6F9E7D',
    scarfDark: '#527C60',
    accent: '#E8B26A',
    glow: '#F4D8A9',
  };
  const expression = pose === 'sleep' ? 'sleepy' : pose === 'celebrate' ? 'joyful' : mood;
  const isHappy = expression === 'joyful';
  const isSleepy = expression === 'sleepy';
  const isMissing = expression === 'missing';
  const isFocused = expression === 'focused';
  const showCrown = level >= 9;
  const showPin = level >= 3;
  const showScarf = level >= 2;
  const gradientId = `mori-glow-${type}-${level}`;

  const eyes = isHappy || isSleepy ? (
    <g stroke={colors.furDark} strokeWidth="5.5" fill="none" strokeLinecap="round">
      <path d="M123 153c5-7 13-7 18 0" />
      <path d="M179 153c5-7 13-7 18 0" />
    </g>
  ) : (
    <g className={animated ? 'animate-blink' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
      <ellipse cx="132" cy="153" rx={isFocused ? 6 : 7} ry={isFocused ? 7 : 9} fill={colors.furDark} />
      <ellipse cx="188" cy="153" rx={isFocused ? 6 : 7} ry={isFocused ? 7 : 9} fill={colors.furDark} />
      <circle cx="134.4" cy="149.5" r="2.2" fill="#FFF9EB" />
      <circle cx="190.4" cy="149.5" r="2.2" fill="#FFF9EB" />
      {isMissing && (
        <g stroke={colors.furDark} strokeWidth="4" strokeLinecap="round" fill="none" opacity=".8">
          <path d="M121 136c7-5 15-4 21 0" />
          <path d="M178 136c6-4 14-5 21 0" />
        </g>
      )}
      {isFocused && (
        <g stroke={colors.furDark} strokeWidth="4" strokeLinecap="round" fill="none" opacity=".75">
          <path d="M122 137l17 3" />
          <path d="M198 137l-17 3" />
        </g>
      )}
    </g>
  );

  const mouth = isHappy ? (
    <path d="M152 188c5 7 11 7 16 0" stroke={colors.furDark} strokeWidth="3.4" fill="none" strokeLinecap="round" />
  ) : isMissing ? (
    <path d="M154 193c4-3 8-3 12 0" stroke={colors.furDark} strokeWidth="3.2" fill="none" strokeLinecap="round" />
  ) : isSleepy ? (
    <path d="M155 190c3 2 7 2 10 0" stroke={colors.furDark} strokeWidth="3.2" fill="none" strokeLinecap="round" />
  ) : (
    <path d="M151 187c4 5 13 5 18 0" stroke={colors.furDark} strokeWidth="3.2" fill="none" strokeLinecap="round" />
  );

  const arms =
    pose === 'celebrate' ? (
      <g>
        <path d="M114 240c-18-16-23-36-16-52" stroke={colors.fur} strokeWidth="22" strokeLinecap="round" fill="none" />
        <circle cx="97" cy="183" r="13" fill={colors.fur} />
        <path d="M206 240c18-16 23-36 16-52" stroke={colors.fur} strokeWidth="22" strokeLinecap="round" fill="none" />
        <circle cx="223" cy="183" r="13" fill={colors.fur} />
      </g>
    ) : (
      <g>
        <path d="M110 244c-13 10-16 29-7 41" stroke={colors.fur} strokeWidth="21" strokeLinecap="round" fill="none" />
        <circle cx="105" cy="288" r="13" fill={colors.fur} />
        <path d="M210 244c13 10 16 29 7 41" stroke={colors.fur} strokeWidth="21" strokeLinecap="round" fill="none" />
        <circle cx="215" cy="288" r="13" fill={colors.fur} />
      </g>
    );

  return (
    <svg
      viewBox={faceOnly ? '58 34 204 204' : '0 0 320 340'}
      width={size}
      height={size}
      className={cn('select-none overflow-visible', className)}
      role="img"
      aria-label={`${companion?.name || 'MORI companion'}, looking ${expression}`}
    >
      <defs>
        <radialGradient id={gradientId}>
          <stop offset="0%" stopColor={colors.glow} stopOpacity=".55" />
          <stop offset="65%" stopColor={colors.glow} stopOpacity=".13" />
          <stop offset="100%" stopColor={colors.glow} stopOpacity="0" />
        </radialGradient>
      </defs>

      {glow && !faceOnly && <circle cx="160" cy="218" r="142" fill={`url(#${gradientId})`} />}
      {!faceOnly && (
        <ellipse cx="160" cy="317" rx="86" ry="12" fill={colors.furDark} opacity=".12" />
      )}

      <g
        className={animated ? 'animate-breathe' : undefined}
        style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}
      >
        {/* Fox tail lives behind the body. */}
        {type === 'fox' && (
          <g>
            <path
              d="M220 271c35-4 59-28 55-58-5-29-28-39-48-28 13 12 13 31 0 44-13 13-18 31-7 42Z"
              fill={colors.fur}
            />
            <path
              d="M274 187c6 7 9 17 8 27-9 2-18-1-24-7 6-6 11-13 16-20Z"
              fill={colors.furLight}
            />
          </g>
        )}

        {/* Feet */}
        <ellipse cx="129" cy="304" rx="29" ry="16" fill={colors.fur} />
        <ellipse cx="191" cy="304" rx="29" ry="16" fill={colors.fur} />
        <ellipse cx="129" cy="307" rx="17" ry="8" fill={colors.furLight} opacity=".9" />
        <ellipse cx="191" cy="307" rx="17" ry="8" fill={colors.furLight} opacity=".9" />

        {/* Body */}
        <path
          d="M112 226c-8 22-8 53 9 70 18 18 61 21 84 5 19-14 24-45 15-73-8-26-30-39-55-39-25 0-45 13-53 37Z"
          fill={colors.fur}
        />
        <path
          d="M136 241c-6 18-5 40 4 53 11 16 35 17 47 1 9-13 10-35 3-53-6-15-16-22-27-22s-22 8-27 21Z"
          fill={colors.furLight}
        />

        {/* Ears, antlers, extra faces behind the head */}
        {type === 'bear' && (
          <g>
            <circle cx="101" cy="101" r="28" fill={colors.fur} />
            <circle cx="219" cy="101" r="28" fill={colors.fur} />
            <circle cx="101" cy="101" r="15" fill={colors.inner} />
            <circle cx="219" cy="101" r="15" fill={colors.inner} />
          </g>
        )}

        {type === 'deer' && (
          <g>
            <ellipse cx="96" cy="110" rx="23" ry="40" transform="rotate(-27 96 110)" fill={colors.fur} />
            <ellipse cx="96" cy="112" rx="12" ry="28" transform="rotate(-27 96 112)" fill={colors.inner} opacity=".85" />
            <ellipse cx="224" cy="110" rx="23" ry="40" transform="rotate(27 224 110)" fill={colors.fur} />
            <ellipse cx="224" cy="112" rx="12" ry="28" transform="rotate(27 224 112)" fill={colors.inner} opacity=".85" />
            <g stroke={colors.furDark} strokeWidth="6" strokeLinecap="round" fill="none">
              <path d="M127 90c-8-20-9-40-2-58" />
              <path d="M118 59c-10-5-16-13-17-23" />
              <path d="M126 44c7-6 11-14 11-23" />
              <path d="M193 90c8-20 9-40 2-58" />
              <path d="M202 59c10-5 16-13 17-23" />
              <path d="M194 44c-7-6-11-14-11-23" />
            </g>
          </g>
        )}

        {type === 'fox' && (
          <g>
            <path d="M91 119 99 53l43 41Z" fill={colors.fur} />
            <path d="M108 93l6-28 20 23Z" fill={colors.inner} opacity=".9" />
            <path d="M229 119 221 53l-43 41Z" fill={colors.fur} />
            <path d="M212 93l-6-28-20 23Z" fill={colors.inner} opacity=".9" />
          </g>
        )}

        {/* Head */}
        <path
          d="M160 82c44 0 75 29 75 70 0 42-31 72-75 72s-75-30-75-72c0-41 31-70 75-70Z"
          fill={colors.fur}
        />

        {/* Face light patches */}
        {type === 'fox' ? (
          <g>
            <path
              d="M87 169c14 7 21 27 37 35 12 6 23 9 36 9s25-3 36-9c16-8 23-28 37-35-4 30-28 55-73 55s-69-25-73-55Z"
              fill={colors.furLight}
            />
            <path d="M88 162c6 17 18 22 31 18-7-12-11-25-12-38-8 5-14 12-19 20Z" fill={colors.furLight} />
            <path d="M232 162c-6 17-18 22-31 18 7-12 11-25 12-38 8 5 14 12 19 20Z" fill={colors.furLight} />
          </g>
        ) : (
          <ellipse cx="160" cy="185" rx="37" ry="27" fill={colors.furLight} />
        )}

        {type === 'bear' && (
          <g opacity=".35" fill={colors.inner}>
            <ellipse cx="107" cy="178" rx="16" ry="8" />
            <ellipse cx="213" cy="178" rx="16" ry="8" />
          </g>
        )}

        {/* Blush */}
        <ellipse cx="114" cy="181" rx="16" ry="8" fill="#E99584" opacity=".36" />
        <ellipse cx="206" cy="181" rx="16" ry="8" fill="#E99584" opacity=".36" />

        {eyes}

        {/* Nose + mouth */}
        <path
          d="M152 173c0-4 4-7 8-7s8 3 8 7c0 4-4 8-8 8s-8-4-8-8Z"
          fill={colors.furDark}
        />
        {mouth}

        {/* Scarf */}
        {showScarf ? (
          <g>
            <path d="M119 218c25 14 56 15 82 0l-4 18c-23 12-51 11-75-1l-3-17Z" fill={colors.scarf} />
            <path d="M130 235c-4 15-9 24-19 33 12 2 22-1 29-6 4-7 6-17 5-28l-15 1Z" fill={colors.scarfDark} />
            <path d="M119 218c25 14 56 15 82 0" stroke={colors.scarfDark} strokeWidth="2.5" fill="none" opacity=".5" />
            {showPin && (
              <g transform="translate(180 228)">
                <circle r="9" fill={colors.accent} />
                <path d="M0-4.5 1.3-1.4 4.6-1.2 2.1.9 2.9 4.1 0 2.3-2.9 4.1-2.1.9-4.6-1.2-1.3-1.4Z" fill="#FFF7E1" />
              </g>
            )}
          </g>
        ) : (
          <path d="M126 215c19 10 48 11 68 0" stroke={colors.scarf} strokeWidth="8" strokeLinecap="round" fill="none" opacity=".55" />
        )}

        {arms}

        {/* Sprout always grows from the head. */}
        <g
          className={animated ? 'animate-sway' : undefined}
          style={{ transformBox: 'fill-box', transformOrigin: 'bottom center' }}
        >
          <path d="M160 84V59" stroke="#4F7960" strokeWidth="4" strokeLinecap="round" />
          <path d="M160 71c-14 1-23-8-25-22 14-1 23 7 25 22Z" fill="#6DAE77" />
          <path d="M160 63c13 1 22-7 24-20-13-1-22 6-24 20Z" fill="#89BF84" />
        </g>

        {/* Premium/high-level crown */}
        {showCrown && (
          <g className={animated ? 'animate-float' : undefined}>
            <path d="M120 78c9-16 21-24 40-25 19 1 31 9 40 25" stroke="#D9B45D" strokeWidth="4" fill="none" />
            {[0, 1, 2, 3, 4].map((index) => {
              const angle = -68 + index * 34;
              const x = 160 + Math.sin((angle * Math.PI) / 180) * 50;
              const y = 61 - Math.cos((angle * Math.PI) / 180) * 15;
              return (
                <g key={index} transform={`translate(${x} ${y}) rotate(${angle})`}>
                  <ellipse rx="8" ry="4.5" fill={LEAF_COLORS[index % LEAF_COLORS.length]} />
                </g>
              );
            })}
            <circle cx="160" cy="53" r="5" fill="#F4E4AE" stroke="#D9B45D" strokeWidth="2" />
          </g>
        )}

        {/* An open book appears during a focus session. */}
        {pose === 'study' && (
          <g>
            <path d="M109 274c16-11 34-10 51-3v37c-17-7-35-8-51 2v-36Z" fill={colors.scarfDark} />
            <path d="M211 274c-16-11-34-10-51-3v37c17-7 35-8 51 2v-36Z" fill={colors.scarf} />
            <path d="M114 270c15-9 31-8 46-2v30c-15-6-31-6-46 2v-30Z" fill="#FFF9EA" />
            <path d="M206 270c-15-9-31-8-46-2v30c15-6 31-6 46 2v-30Z" fill="#FFF9EA" />
            <path d="M160 268v30" stroke="#D8CDB6" strokeWidth="2.5" />
            <g stroke="#B9B09C" strokeWidth="1.8" strokeLinecap="round" opacity=".65">
              <path d="M122 279c9-3 18-3 27 0" />
              <path d="M122 286c9-3 18-3 27 0" />
              <path d="M171 279c9-3 18-3 27 0" />
              <path d="M171 286c9-3 18-3 27 0" />
            </g>
            <circle cx="112" cy="282" r="12" fill={colors.fur} />
            <circle cx="208" cy="282" r="12" fill={colors.fur} />
          </g>
        )}
      </g>

      {isSleepy && !faceOnly && (
        <g fill={colors.furDark} fontFamily="Nunito, sans-serif" fontWeight="800">
          <text x="237" y="116" fontSize="19" opacity=".5" className={animated ? 'animate-zzz' : undefined}>
            z
          </text>
          <text x="251" y="96" fontSize="24" opacity=".35" className={animated ? 'animate-zzz' : undefined} style={{ animationDelay: '.7s' }}>
            z
          </text>
          <text x="265" y="75" fontSize="29" opacity=".22" className={animated ? 'animate-zzz' : undefined} style={{ animationDelay: '1.4s' }}>
            z
          </text>
        </g>
      )}
    </svg>
  );
}
