(function () {
  const course = window.MusicCourse || {};
  const lessons = course.LESSONS || [];

  const lessonList = document.getElementById('lesson-list');
  const categoryFilters = document.getElementById('category-filters');
  const lessonTitle = document.getElementById('lesson-title');
  const lessonCategory = document.getElementById('lesson-category');
  const lessonChapter = document.getElementById('lesson-chapter');
  const lessonDifficulty = document.getElementById('lesson-difficulty');
  const lessonObjective = document.getElementById('lesson-objective');
  const lessonPrompt = document.getElementById('lesson-prompt');
  const lessonExplanation = document.getElementById('lesson-explanation');
  const lessonExample = document.getElementById('lesson-example');
  const lessonExampleTitle = document.getElementById('lesson-example-title');
  const lessonExampleCaption = document.getElementById('lesson-example-caption');
  const lessonExampleSvg = document.getElementById('lesson-example-svg');
  const answerOptions = document.getElementById('answer-options');
  const feedbackBox = document.getElementById('feedback-box');
  const progressBadge = document.getElementById('progress-badge');
  const statLevel = document.getElementById('stat-level');
  const statScore = document.getElementById('stat-score');
  const statSuccesses = document.getElementById('stat-successes');
  const statProgress = document.getElementById('stat-progress');
  const nextLessonButton = document.getElementById('next-lesson');
  const playNoteButton = document.getElementById('play-note');
  const resetProgressButton = document.getElementById('reset-progress');

  const STORAGE_KEY = 'professeur-musique-progress';
  let currentFilter = 'Tous';
  let currentIndex = -1;
  let expandedChapter = null;
  let state = { score: 0, successes: 0, completed: [] };

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function addSvgElement(parent, name, attributes, text) {
    const element = document.createElementNS(SVG_NS, name);
    Object.entries(attributes || {}).forEach(([attribute, value]) => {
      element.setAttribute(attribute, String(value));
    });
    if (text !== undefined) {
      element.textContent = text;
    }
    parent.appendChild(element);
    return element;
  }

  function addSvgText(parent, x, y, text, className) {
    return addSvgElement(parent, 'text', { x, y, class: className }, text);
  }

  function drawStaff(svg, notes, alteredNote, clef, noteOverrides) {
    const activeClef = clef || 'sol';
    const lineYs = [54, 78, 102, 126, 150];
    lineYs.forEach((y) => {
      addSvgElement(svg, 'line', { x1: 82, y1: y, x2: 680, y2: y, class: 'example-line' });
    });
    addSvgText(svg, 30, 108, activeClef === 'ut' ? 'clé d’ut' : `clé de ${activeClef}`, 'example-small-label');

    const trebleNoteY = { do: 90, ré: 78, mi: 66, fa: 54, sol: 42, la: 30, si: 18 };
    const bassNoteY = { do: 114, ré: 102, mi: 90, fa: 78, sol: 66, la: 54, si: 42 };
    const altoNoteY = { do: 102, ré: 90, mi: 78, fa: 66, sol: 54, la: 42, si: 30 };
    const noteY = {
      ...(activeClef === 'fa'
        ? bassNoteY
        : activeClef === 'ut'
          ? altoNoteY
          : trebleNoteY),
      ...(noteOverrides || {})
    };
    const startX = notes.length > 1 ? 145 : 360;
    const gap = notes.length > 1 ? 480 / (notes.length - 1) : 0;
    notes.forEach((note, index) => {
      const x = startX + gap * index;
      const y = noteY[note.toLowerCase()] || 102;
      if (y === 30 || y === 6 || y === 174) {
        addSvgElement(svg, 'line', {
          x1: x - 16,
          y1: y,
          x2: x + 16,
          y2: y,
          class: 'example-line'
        });
      }
      addSvgElement(svg, 'ellipse', {
        cx: x,
        cy: y,
        rx: 10,
        ry: 7,
        transform: `rotate(-25 ${x} ${y})`,
        class: 'example-note'
      });
      addSvgElement(svg, 'line', {
        x1: x + 8,
        y1: y,
        x2: x + 8,
        y2: y - 32,
        class: 'example-line'
      });
      if (note === alteredNote) {
        addSvgText(svg, x - 24, y + 7, '♯', 'example-note-label');
      }
      addSvgText(
        svg,
        x,
        190,
        note === alteredNote ? `${note}♯` : note,
        'example-note-label'
      );
    });
  }

  function drawFlow(svg, rows) {
    rows.forEach((row, rowIndex) => {
      const y = 55 + rowIndex * 105;
      const nodeWidth = Math.min(150, 620 / row.length);
      const gap = row.length > 1 ? (620 - nodeWidth * row.length) / (row.length - 1) : 0;
      const startX = 50;
      row.forEach((item, index) => {
        const x = startX + index * (nodeWidth + gap);
        addSvgElement(svg, 'rect', {
          x,
          y,
          width: nodeWidth,
          height: 56,
          rx: 12,
          class: 'example-node'
        });
        addSvgText(svg, x + nodeWidth / 2, y + 24, item[0], 'example-heading');
        addSvgText(svg, x + nodeWidth / 2, y + 44, item[1], 'example-small-label');
        if (index < row.length - 1) {
          const arrowStart = x + nodeWidth + 5;
          const arrowEnd = x + nodeWidth + gap - 5;
          addSvgElement(svg, 'line', {
            x1: arrowStart,
            y1: y + 28,
            x2: arrowEnd,
            y2: y + 28,
            class: 'example-connector',
            'marker-end': 'url(#example-arrow)'
          });
        }
      });
    });
  }

  function drawChordSets(svg, chordSets) {
    const gap = 12;
    const viewWidth = chordSets.length === 1 ? 480 : 720;
    svg.setAttribute('viewBox', `0 0 ${viewWidth} 240`);
    const width = Math.min(
      chordSets.length === 1 ? 400 : 220,
      (viewWidth - 40 - gap * (chordSets.length - 1)) / chordSets.length
    );
    const totalWidth = chordSets.length * width + (chordSets.length - 1) * gap;
    const startX = (viewWidth - totalWidth) / 2;
    chordSets.forEach((chord, chordIndex) => {
      const x = startX + chordIndex * (width + gap);
      addSvgText(svg, x + width / 2, 35, chord.title, 'example-heading');
      addSvgElement(svg, 'rect', {
        x,
        y: 48,
        width,
        height: 170,
        rx: 14,
        class: 'example-node'
      });
      chord.notes.forEach((note, noteIndex) => {
        const y = 188 - noteIndex * 42;
        addSvgElement(svg, 'ellipse', {
          cx: x + width / 2,
          cy: y,
          rx: 14,
          ry: 10,
          class: 'example-note'
        });
        addSvgText(svg, x + width / 2, y + 5, note, 'example-note-label');
      });
    });
  }

  function drawBeatRows(svg, rows) {
    rows.forEach((row, rowIndex) => {
      const y = 42 + rowIndex * 88;
      const groupWidth = row.spacing || 550;
      const width = groupWidth / row.items.length;
      const startX = 140 + (550 - groupWidth) / 2;
      addSvgText(svg, 32, y + 31, row.label, 'example-heading');
      row.items.forEach((item, index) => {
        const x = startX + index * width;
        addSvgElement(svg, 'rect', {
          x,
          y,
          width: width - 8,
          height: 58,
          rx: 10,
          class: item === row.accent ? 'example-node example-node-accent' : 'example-node'
        });
        addSvgText(svg, x + (width - 8) / 2, y + 25, item, 'example-heading');
        if (row.subdivision) {
          addSvgText(svg, x + (width - 8) / 2, y + 47, row.subdivision, 'example-small-label');
        }
      });
    });
  }

  function drawRhythm(svg, lesson) {
    const rhythmExamples = {
      'note-figures': [{ label: 'Durées', items: ['ronde', 'blanche', 'noire', 'croche'] }],
      'relative-note-values': [{ label: 'Équivalence', items: ['1 ronde', '2 blanches', '4 noires'] }],
      'note-values': [{ label: 'Noire', items: ['1', '2'], subdivision: '2 temps' }],
      'dotted-notes': [{ label: 'Pointée', items: ['noire', '+', 'croche'], subdivision: '1 + 1/2 temps' }],
      triplet: [{ label: 'Triolet', items: ['1', '2', '3'], subdivision: '3 dans 1 temps' }],
      rests: [{ label: 'Silence', items: ['soupir'], subdivision: '1 temps' }],
      'half-rest': [{ label: 'Demi-pause', items: ['1', '2'], subdivision: '2 temps' }],
      tie: [{ label: 'Liaison', items: ['noire', 'noire liée'], subdivision: 'un son de 2 temps' }],
      barline: [{ label: 'Mesure', items: ['temps', 'temps', '|', 'temps', 'temps'] }],
      rhythm: [{ label: 'Noires', items: ['1', '2', '3', '4'], subdivision: '1 temps' }],
      pulse: [{ label: 'Pulsation', items: ['tic', 'tic', 'tic', 'tic'] }],
      tempo: [
        { label: 'Lent', items: ['1', '2', '3', '4'], spacing: 550 },
        { label: 'Rapide', items: ['1', '2', '3', '4'], spacing: 320 }
      ],
      'rhythm-vs-pulse': [
        { label: 'Pulsation', items: ['1', '2', '3', '4'] },
        { label: 'Rythme', items: ['noire', 'croches', 'noire', 'silence'] }
      ],
      'rhythmic-subdivision': [
        { label: '1 pulsation', items: ['1'], subdivision: 'noire' },
        { label: 'Subdivisée', items: ['1', 'et'], subdivision: 'croches' }
      ],
      'rhythmic-accent': [{ label: 'Accent', items: ['FORT', 'faible', 'faible', 'faible'], accent: 'FORT' }],
      syncopation: [{ label: 'Contretemps', items: ['1', 'et', '2', 'et', '3', 'et'], accent: 'et' }],
      'rhythmic-silence': [{ label: 'Motif', items: ['noire', 'soupir', 'noire', 'noire'] }],
      'count-rhythm-pattern': [{ label: 'Total', items: ['1 noire', '2 croches'], subdivision: '1 temps + 1 temps' }],
      'time-signature': [{ label: '4/4', items: ['1', '2', '3', '4'], subdivision: 'noire' }],
      'time-signature-reading': [
        { label: '3/4', items: ['1', '2', '3'], subdivision: '3 noires' },
        { label: '6/8', items: ['1', '2', '3', '4', '5', '6'], subdivision: '6 croches' }
      ],
      'simple-meters': [{ label: '3/4', items: ['1', '2', '3'], subdivision: '2 subdivisions égales' }],
      'compound-meters': [
        { label: '6/8', items: ['1', '2', '3', '4', '5', '6'], subdivision: '2 groupes de 3' }
      ],
      'simple-vs-compound-meter': [
        { label: 'Simple', items: ['1', 'et'], subdivision: 'division en 2' },
        { label: 'Composée', items: ['1', '2', '3'], subdivision: 'division en 3' }
      ],
      'meter-accents': [{ label: '3/4', items: ['FORT', 'faible', 'faible'], accent: 'FORT' }],
      'barlines-and-measures': [
        { label: 'Mesures', items: ['|', '1  2  3', '|', '1  2  3', '|'] }
      ],
      'complete-a-measure': [{ label: '3/4', items: ['noire', 'reste', 'reste'], accent: 'reste' }],
      anacrusis: [{ label: 'Levée', items: ['avant', '|', 'temps fort', 'suite'] }]
    };
    drawBeatRows(svg, rhythmExamples[lesson.id] || [
      { label: 'Pulsation', items: ['1', '2', '3', '4'] }
    ]);
  }

  function drawStaffSequence(svg, lesson) {
    const examples = {
      notes: { notes: ['do', 'ré', 'mi', 'fa', 'sol'] },
      staff: {
        notes: ['mi', 'sol', 'si', 'ré', 'fa'],
        positions: { mi: 150, sol: 126, si: 102, ré: 78, fa: 54 }
      },
      'note-position': { notes: ['do'] },
      'ledger-lines': { notes: ['la'] },
      'treble-clef': { notes: ['sol'], positions: { sol: 126 } },
      'bass-clef': { notes: ['fa'], clef: 'fa' },
      'c-clef': { notes: ['do'], clef: 'ut' },
      octave: { notes: ['do', 'do'], caption: 'Même nom, registres différents' },
      'stepwise-motion': { notes: ['do', 'ré', 'mi', 'fa'] },
      'read-treble-lines': { notes: ['mi'], positions: { mi: 150 } },
      'read-treble-spaces': { notes: ['fa'], positions: { fa: 138 } },
      'read-bass-lines': { notes: ['fa'], clef: 'fa' },
      'read-bass-spaces': { notes: ['do'], clef: 'fa' },
      'read-treble-sequence': {
        notes: ['mi', 'fa', 'sol'],
        positions: { mi: 150, fa: 138, sol: 126 }
      },
      'read-melodic-direction': { notes: ['do', 'ré', 'mi', 'sol'] },
      'note-names': { notes: ['la', 'si', 'do'] }
    };
    const example = examples[lesson.id] || { notes: ['do', 'ré', 'mi', 'fa', 'sol'] };
    drawStaff(svg, example.notes, null, example.clef || 'sol', example.positions);
  }

  function drawIntervalExample(svg, lesson) {
    if (lesson.id === 'major-scale') {
      drawBeatRows(svg, [
        { label: 'Notes', items: ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do'] },
        { label: 'Intervalles', items: ['T', 'T', 'D', 'T', 'T', 'T', 'D'] }
      ]);
      addSvgText(svg, 360, 220, 'T = ton · D = demi-ton', 'example-small-label');
      return;
    }
    if (lesson.id === 'major-scale-pattern') {
      drawBeatRows(svg, [
        { label: 'Schéma', items: ['T', 'T', 'D', 'T', 'T', 'T', 'D'] }
      ]);
      addSvgText(svg, 360, 132, 'T = ton · D = demi-ton', 'example-small-label');
      return;
    }
    const examples = {
      intervals: [['Do', 'départ'], ['Sol', 'quinte juste']],
      'minor-third': [['Do', 'départ'], ['Mi', 'tierce majeure']],
      'minor-third-quality': [['Do', 'départ'], ['Mi bémol', 'tierce mineure']],
      'diatonic-semitone': [['Mi', 'naturel'], ['Fa', 'demi-ton']],
      'chromatic-semitone': [['Do', 'naturel'], ['Do dièse', 'demi-ton']],
      enharmonic: [['Do dièse', 'même hauteur'], ['Ré bémol', 'autre écriture']],
      'compound-interval': [['Quinte', 'intervalle simple'], ['12e', 'intervalle redoublé']],
      'interval-direction': [['Sol', 'départ'], ['Do', 'descendant']],
      'augmented-fourth': [['Do', 'départ'], ['Fa dièse', 'quarte augmentée']],
      'interval-inversion': [['Do–Sol', 'quinte'], ['Sol–Do', 'quarte']],
      consonance: [['Do–Sol', 'quinte juste'], ['Repos relatif', 'consonance']]
    };
    const row = examples[lesson.id] || [['Do', 'note de départ'], ['Sol', 'note d’arrivée']];
    drawFlow(svg, [row]);
  }

  function drawNotationExample(svg, lesson) {
    const accidentalExamples = {
      accidentals: [['Fa', 'naturel'], ['Fa♯', '+ 1/2 ton'], ['Fa♭', '− 1/2 ton']],
      'natural-sign': [['Fa♯', 'dièse'], ['Fa♮', 'bécarre'], ['Fa', 'hauteur naturelle']],
      'key-accidental': [['Armure', 'altération valable'], ['♮ devant la note', 'annule ponctuellement']],
      'double-accidentals': [['Do', 'naturel'], ['Do♯', '+ 1/2 ton'], ['Do𝄪', '+ 1 ton']]
    };
    const rhythmIds = [
      'note-figures',
      'relative-note-values',
      'note-values',
      'dotted-notes',
      'triplet',
      'rests',
      'half-rest',
      'tie',
      'barline'
    ];
    if (rhythmIds.includes(lesson.id)) {
      drawRhythm(svg, lesson);
    } else if (accidentalExamples[lesson.id]) {
      drawFlow(svg, [accidentalExamples[lesson.id]]);
    } else if (lesson.id === 'octave') {
      drawFlow(svg, [[['Do 4', 'registre grave'], ['Do 5', 'registre aigu']]]);
    } else {
      drawStaffSequence(svg, lesson);
    }
  }

  function drawTonalityExample(svg, lesson) {
    const examples = {
      keys: [['Do majeur', '0 altération'], ['Fa majeur', 'si bémol']],
      'relative-minor': [['Do majeur', 'tonalité majeure'], ['La mineur', 'mineur relatif']],
      'scale-degrees': [['I', 'tonique · do'], ['IV', 'sous-dominante'], ['V', 'dominante']],
      'two-sharp-key': [['Ré majeur', 'fa dièse'], ['Armure', 'do dièse']],
      'parallel-keys': [['Do majeur', 'mode majeur'], ['Do mineur', 'même tonique']],
      'minor-scale-types': [['La mineur', 'sol naturel'], ['Harmonique', 'sol dièse']],
      'melodic-minor': [['La mineur', 'fa naturel'], ['Mélodique ascendante', 'fa dièse · sol dièse']],
      tetrachords: [['1er tétracorde', 'T – T – D'], ['2e tétracorde', 'T – T – D']],
      'chromatic-scale': [['Do', 'do♯'], ['Ré', 'ré♯'], ['Mi', 'fa']],
      'modulation-definition': [['Do majeur', 'ancien centre'], ['Sol majeur', 'nouveau centre']],
      transposition: [['Do – Ré – Mi', 'motif initial'], ['Sol – La – Si', 'motif transposé']],
      modulation: [['Do majeur', 'do'], ['Ré7', 'V7 de sol'], ['Sol majeur', 'nouveau centre']]
    };
    if (lesson.id === 'sharp-order' || lesson.id === 'flat-order') {
      const order = lesson.id === 'sharp-order'
        ? ['Fa', 'Do', 'Sol', 'Ré', 'La', 'Mi', 'Si']
        : ['Si', 'Mi', 'La', 'Ré', 'Sol', 'Do', 'Fa'];
      drawBeatRows(svg, [{ label: lesson.id === 'sharp-order' ? 'Dièses' : 'Bémols', items: order }]);
      return;
    }
    drawFlow(svg, [examples[lesson.id] || [['Do majeur', 'tonalité'], ['Sol majeur', 'dominante']]]);
  }

  function drawChordExample(svg, lesson) {
    const examples = {
      triads: { title: 'Do majeur', notes: ['do', 'mi', 'sol'] },
      'triad-construction': { title: 'Triade', notes: ['fondamentale', 'tierce', 'quinte'] },
      'triad-root': { title: 'Do majeur', notes: ['do', 'mi', 'sol'] },
      'major-triad-structure': { title: 'Majeure', notes: ['do', 'mi', 'sol'] },
      'minor-triad': { title: 'La mineur', notes: ['la', 'do', 'mi'] },
      'diminished-triad': { title: 'Si diminué', notes: ['si', 'ré', 'fa'] },
      'augmented-triad': { title: 'Do augmenté', notes: ['do', 'mi', 'sol♯'] },
      'diatonic-triad-qualities': { title: 'VII° en do', notes: ['si', 'ré', 'fa'] },
      'triad-identification': { title: 'Triade mineure', notes: ['la', 'do', 'mi'] },
      'dominant-seventh': { title: 'Sol 7', notes: ['sol', 'si', 'ré', 'fa'] },
      'seventh-chords': { title: 'Accord de 7e', notes: ['do', 'mi', 'sol', 'si'] },
      'major-seventh-chord': { title: 'Do maj7', notes: ['do', 'mi', 'sol', 'si'] },
      'minor-seventh-chord': { title: 'La m7', notes: ['la', 'do', 'mi', 'sol'] },
      'half-diminished-seventh': { title: 'Si ø7', notes: ['si', 'ré', 'fa', 'la'] },
      'fully-diminished-seventh': { title: 'Si°7', notes: ['si', 'ré', 'fa', 'la♭'] },
      'dominant-seventh-structure': { title: 'Sol 7', notes: ['sol', 'si', 'ré', 'fa'] },
      'diatonic-seventh-chord': { title: 'Ré m7', notes: ['ré', 'fa', 'la', 'do'] },
      inversions: { title: '1er renversement', notes: ['mi', 'sol', 'do'] },
      'root-position': { title: 'Fondamental', notes: ['do', 'mi', 'sol'] },
      'triad-second-inversion': { title: '2e renversement', notes: ['sol', 'do', 'mi'] },
      'identify-first-inversion': { title: 'Basse : mi', notes: ['mi', 'sol', 'do'] },
      'identify-second-inversion': { title: 'Basse : sol', notes: ['sol', 'do', 'mi'] },
      'triad-inversion-figures': { title: 'Triade', notes: ['5/3', '6', '6/4'] },
      'inversion-identity': { title: 'Même accord', notes: ['do', 'mi', 'sol'] },
      'seventh-inversion-bass': { title: '3e renversement', notes: ['si', 'do', 'mi', 'sol'] },
      'inversion-bass-line': { title: 'Basse conjointe', notes: ['do', 'si', 'la', 'sol'] }
    };
    const progressionExamples = {
      'dominant-seventh-resolution': [['Sol7', 'si monte à do'], ['Do majeur', 'fa descend à mi']],
      'triad-inversion-figures': [['5/3', 'fondamental'], ['6', '1er renv.'], ['6/4', '2e renv.']],
      'seventh-chord-inversions': [['Fondamental', 'basse : fondamentale'], ['1er renv.', 'basse : tierce'], ['2e renv.', 'basse : quinte'], ['3e renv.', 'basse : 7e']],
      'seventh-inversion-figures': [['7', 'fondamental'], ['6/5', '1er renv.'], ['4/3', '2e renv.'], ['4/2', '3e renv.']],
      'inversion-bass-line': [['Do', 'basse'], ['Si', 'basse'], ['La', 'basse'], ['Sol', 'basse']]
    };
    if (progressionExamples[lesson.id]) {
      drawFlow(svg, [progressionExamples[lesson.id]]);
      return;
    }
    const example = examples[lesson.id] || { title: 'Accord', notes: ['do', 'mi', 'sol'] };
    drawChordSets(svg, [example]);
  }

  function drawFunctionExample(svg, lesson) {
    const examples = {
      'tonic-dominant': [['V', 'dominante'], ['I', 'tonique']],
      subdominant: [['IV', 'fa majeur'], ['V', 'sol majeur'], ['I', 'do majeur']],
      'harmonic-function-concept': [['I', 'stabilité'], ['IV', 'préparation'], ['V', 'tension']],
      'tonic-function': [['I', 'repos tonal'], ['I', 'centre tonal']],
      'dominant-function': [['V7', 'tension'], ['I', 'résolution']],
      'predominant-function': [['ii', 'préparation'], ['V', 'dominante']],
      'functional-degree-groups': [['I', 'tonique'], ['IV', 'sous-dominante'], ['V', 'dominante']],
      'identify-harmonic-function': [['Ré majeur', 'V en sol'], ['Sol majeur', 'I cible']],
      'tonic-subdominant-dominant': [['I', 'do'], ['IV', 'fa'], ['V', 'sol']],
      'function-vs-chord-quality': [['Do majeur', 'nature'], ['I', 'fonction en do']]
    };
    drawFlow(svg, [examples[lesson.id] || [['I', 'tonique'], ['V', 'dominante'], ['I', 'tonique']]]);
  }

  function drawCadenceExample(svg, lesson) {
    const examples = {
      cadence: [['V', 'dominante'], ['I', 'tonique']],
      'plagal-cadence': [['IV', 'sous-dominante'], ['I', 'tonique']],
      'imperfect-cadence': [['V renversé', 'dominante'], ['I', 'tonique']],
      'deceptive-cadence': [['V', 'attente'], ['VI', 'surprise']],
      'half-cadence': [['II', 'préparation'], ['V', 'suspension']],
      'cadence-role': [['Phrase', 'tension'], ['Cadence', 'ponctuation']],
      'perfect-cadence-criteria': [['V fondamental', 'mélodie : si'], ['I fondamental', 'mélodie : do']],
      'compare-cadences': [['V – I', 'parfaite'], ['IV – I', 'plagale'], ['V – VI', 'rompue']],
      'cadential-six-four': [['I 6/4', 'basse : sol'], ['V', 'basse : sol'], ['I', 'do']]
    };
    drawFlow(svg, [examples[lesson.id] || [['V', 'dominante'], ['I', 'tonique']]]);
  }

  function drawSecondaryDominantExample(svg, lesson) {
    const examples = {
      'secondary-dominant': [['V7/ii', 'la7'], ['ii', 'ré mineur']],
      'secondary-dominant-notation': [['V7', 'accord dominant'], ['/ii', 'cible : degré ii']],
      'secondary-dominant-v-v': [['Ré majeur', 'V/V'], ['Sol majeur', 'V']],
      'secondary-dominant-v-ii': [['La majeur', 'V/ii'], ['Ré mineur', 'ii']],
      'secondary-dominant-v7-vi': [['Mi7', 'V7/vi'], ['La mineur', 'vi']],
      'secondary-dominant-resolution': [['Ré7', 'V7/V'], ['Sol majeur', 'V en do']],
      'secondary-dominant-tendency-tones': [['Fa♯', 'monte à sol'], ['Do', 'descend à si']],
      'tonicization-vs-modulation': [['V/ii', 'tonicisation brève'], ['nouveau centre', 'modulation établie']],
      'identify-secondary-dominant': [['Ré7', 'V7/V'], ['Sol', 'cible de V']]
    };
    drawFlow(svg, [examples[lesson.id] || [['V/x', 'dominante secondaire'], ['x', 'degré visé']]]);
  }

  function drawVoiceLeadingExample(svg, lesson) {
    const examples = {
      'voice-leading': [['Do majeur', 'do–mi–sol'], ['Sol majeur', 'si–ré–sol']],
      'voice-leading-principle': [['Accord I', 'notes proches'], ['Accord V', 'liaison fluide']],
      'types-of-voice-motion': [['Deux voix', 'même direction'], ['Intervalle', 'qui change']],
      'contrary-motion': [['Voix haute', 'monte ↑'], ['Voix basse', 'descend ↓']],
      'parallel-octaves': [['Do – do', 'octave juste'], ['Ré – ré', 'octave parallèle']],
      'retain-common-tones': [['Do majeur', 'do–mi–sol'], ['Sol majeur', 'si–ré–sol'], ['Sol', 'note commune tenue']],
      'tendency-tones-leading': [['Sol7', 'si et fa'], ['Do majeur', 'do et mi']],
      'voice-crossing': [['Ordre initial', 'alto sous soprano'], ['Croisement', 'alto passe au-dessus']],
      'upper-voice-spacing': [['Soprano', 'voix supérieure'], ['Alto', '≤ une octave'], ['Ténor', 'voix inférieure']]
    };
    drawFlow(svg, [examples[lesson.id] || [['Do majeur', 'départ'], ['Sol majeur', 'arrivée']]]);
  }

  function drawReadingExample(svg, lesson) {
    if (lesson.id === 'read-simultaneous-notes') {
      drawChordSets(svg, [{ title: 'Même instant', notes: ['do', 'mi', 'sol'] }]);
    } else if (lesson.id === 'sight-reading-landmarks') {
      drawFlow(svg, [[
        ['Clé', 'nommer les notes'],
        ['Armure', 'altérations'],
        ['Mesure', 'organiser les temps']
      ]]);
    } else {
      drawStaffSequence(svg, lesson);
    }
  }

  function renderLessonExample(lesson) {
    while (lessonExampleSvg.firstChild) {
      lessonExampleSvg.removeChild(lessonExampleSvg.firstChild);
    }

    if (!lesson) {
      lessonExample.hidden = true;
      lessonExampleSvg.removeAttribute('aria-labelledby');
      return;
    }

    const chapterNumber = lesson.chapter.slice(0, 2);
    const titleId = 'lesson-example-title';
    const captionId = 'lesson-example-caption';
    lessonExampleTitle.textContent = `Exemple visuel — ${lesson.title}`;
    lessonExampleCaption.textContent = lesson.objective;
    lessonExampleSvg.setAttribute('viewBox', '0 0 720 240');
    lessonExampleSvg.setAttribute('aria-labelledby', `${titleId} ${captionId}`);

    const marker = addSvgElement(lessonExampleSvg, 'defs', {});
    const arrow = addSvgElement(marker, 'marker', {
      id: 'example-arrow',
      viewBox: '0 0 10 10',
      refX: 8,
      refY: 5,
      markerWidth: 6,
      markerHeight: 6,
      orient: 'auto-start-reverse'
    });
    addSvgElement(arrow, 'path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#c084fc' });

    if (chapterNumber === '01') {
      drawNotationExample(lessonExampleSvg, lesson);
    } else if (chapterNumber === '02') {
      drawIntervalExample(lessonExampleSvg, lesson);
    } else if (chapterNumber === '03') {
      drawTonalityExample(lessonExampleSvg, lesson);
    } else if (['04', '05', '06'].includes(chapterNumber)) {
      drawChordExample(lessonExampleSvg, lesson);
    } else if (chapterNumber === '07') {
      drawFunctionExample(lessonExampleSvg, lesson);
    } else if (chapterNumber === '08' || chapterNumber === '09') {
      drawRhythm(lessonExampleSvg, lesson);
    } else if (chapterNumber === '10') {
      drawReadingExample(lessonExampleSvg, lesson);
    } else if (chapterNumber === '11') {
      drawCadenceExample(lessonExampleSvg, lesson);
    } else if (chapterNumber === '12') {
      drawSecondaryDominantExample(lessonExampleSvg, lesson);
    } else if (chapterNumber === '13') {
      drawVoiceLeadingExample(lessonExampleSvg, lesson);
    }

    lessonExample.hidden = false;
  }

  function getVisibleLessons() {
    return (currentFilter === 'Tous' ? lessons : lessons.filter((lesson) => lesson.category === currentFilter))
      .slice()
      .sort((left, right) => left.chapter.localeCompare(right.chapter, 'fr', { numeric: true }));
  }

  function levelLabel() {
    const total = lessons.length || 1;
    const completion = Math.round((state.completed.length / total) * 100);
    if (completion >= 80) return 'Avancé';
    if (completion >= 50) return 'Intermédiaire';
    if (completion >= 20) return 'Élève confirmé';
    return 'Débutant';
  }

  function loadState() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return;
      }
      state = { ...state, ...JSON.parse(stored) };
    } catch (error) {
      console.warn('Impossible de charger la progression locale.', error);
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Impossible de sauvegarder la progression locale.', error);
    }
  }

  function updateStats() {
    const total = lessons.length || 1;
    const percent = Math.round((state.completed.length / total) * 100);
    progressBadge.textContent = `${state.score} points`;
    statLevel.textContent = levelLabel();
    statScore.textContent = String(state.score);
    statSuccesses.textContent = String(state.successes);
    statProgress.textContent = `${percent}%`;
  }

  function renderCategoryFilters() {
    const categories = ['Tous', ...new Set(lessons.map((lesson) => lesson.category))];
    categoryFilters.innerHTML = '';
    categories.forEach((category) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = category === currentFilter ? 'filter-chip active' : 'filter-chip';
      button.textContent = category;
      button.addEventListener('click', () => {
        currentFilter = category;
        currentIndex = -1;
        expandedChapter = getVisibleLessons()[0]?.chapter || null;
        render();
      });
      categoryFilters.appendChild(button);
    });
  }

  function renderLessonList() {
    const visibleLessons = getVisibleLessons();
    lessonList.innerHTML = '';

    if (!visibleLessons.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-list';
      empty.textContent = 'Aucune leçon dans ce filtre.';
      lessonList.appendChild(empty);
      return;
    }

    const chapters = new Map();
    visibleLessons.forEach((lesson, index) => {
      if (!chapters.has(lesson.chapter)) {
        chapters.set(lesson.chapter, []);
      }
      chapters.get(lesson.chapter).push({ lesson, index });
    });

    chapters.forEach((chapterLessons, chapter) => {
      const group = document.createElement('section');
      group.className = 'chapter-group';

      const isExpanded = chapter === expandedChapter;
      const chapterButton = document.createElement('button');
      chapterButton.type = 'button';
      chapterButton.className = 'chapter-toggle';
      chapterButton.setAttribute('aria-expanded', String(isExpanded));

      const coursesId = `chapter-courses-${chapter.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}`;
      chapterButton.setAttribute('aria-controls', coursesId);

      const title = document.createElement('span');
      title.className = 'chapter-title';
      title.textContent = chapter;
      chapterButton.appendChild(title);

      const count = document.createElement('span');
      count.className = 'chapter-count';
      count.textContent = String(chapterLessons.length);
      chapterButton.appendChild(count);

      const indicator = document.createElement('span');
      indicator.className = 'chapter-indicator';
      indicator.setAttribute('aria-hidden', 'true');
      indicator.textContent = isExpanded ? '−' : '+';
      chapterButton.appendChild(indicator);

      chapterButton.addEventListener('click', () => {
        expandedChapter = isExpanded ? null : chapter;
        renderLessonList();
      });

      const courses = document.createElement('div');
      courses.className = 'chapter-courses';
      courses.id = coursesId;
      courses.hidden = !isExpanded;

      chapterLessons.forEach(({ lesson, index }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = index === currentIndex ? 'lesson-item active' : 'lesson-item';
        const isCompleted = state.completed.includes(lesson.id);
        button.textContent = `${lesson.title}${isCompleted ? ' ✓' : ''}`;
        button.addEventListener('click', () => {
          currentIndex = index;
          expandedChapter = chapter;
          renderCurrentLesson();
        });
        courses.appendChild(button);
      });

      group.appendChild(chapterButton);
      group.appendChild(courses);
      lessonList.appendChild(group);
    });
  }

  function renderCurrentLesson() {
    const visibleLessons = getVisibleLessons();
    const current = visibleLessons[currentIndex];
    expandedChapter = expandedChapter || visibleLessons[0]?.chapter || null;
    renderLessonList();

    if (!current) {
      lessonTitle.textContent = visibleLessons.length ? 'Aucun cours sélectionné' : 'Aucune leçon';
      lessonCategory.textContent = '—';
      lessonChapter.textContent = '—';
      lessonDifficulty.textContent = '—';
      lessonObjective.textContent = visibleLessons.length
        ? 'Choisissez un cours dans un chapitre pour afficher son contenu.'
        : 'Aucune matière sélectionnée.';
      lessonPrompt.textContent = visibleLessons.length
        ? 'Le cours apparaîtra ici après sa sélection.'
        : 'Sélectionnez une autre catégorie.';
      lessonExplanation.textContent = '';
      renderLessonExample(null);
      answerOptions.innerHTML = '';
      feedbackBox.textContent = visibleLessons.length
        ? 'Aucun cours activé.'
        : 'Aucune leçon disponible pour ce filtre.';
      feedbackBox.className = 'feedback-box neutral';
      nextLessonButton.disabled = true;
      playNoteButton.disabled = true;
      playNoteButton.onclick = null;
      updateStats();
      return;
    }

    expandedChapter = expandedChapter || current.chapter;
    lessonTitle.textContent = current.title;
    lessonCategory.textContent = current.category;
    lessonChapter.textContent = current.chapter;
    lessonDifficulty.textContent = current.difficulty;
    lessonObjective.textContent = current.objective;
    lessonPrompt.textContent = current.prompt;
    lessonExplanation.textContent = current.explanation || '';
    renderLessonExample(current);
    answerOptions.innerHTML = '';
    feedbackBox.textContent = 'Sélectionnez une réponse pour commencer.';
    feedbackBox.className = 'feedback-box neutral';

    current.options.forEach((option) => {
      const optionButton = document.createElement('button');
      optionButton.type = 'button';
      optionButton.className = 'option';
      optionButton.textContent = option;
      optionButton.addEventListener('click', () => checkAnswer(option, current));
      answerOptions.appendChild(optionButton);
    });

    updateStats();
    nextLessonButton.disabled = false;
    playNoteButton.disabled = false;
    playNoteButton.onclick = () => playTone(current.answer.split(' ')[0].toLowerCase());
  }

  function checkAnswer(selected, lesson) {
    const correct = selected === lesson.answer;

    Array.from(answerOptions.children).forEach((button) => {
      button.disabled = true;
      if (button.textContent === lesson.answer) {
        button.classList.add('correct');
      }
      if (button.textContent === selected && !correct) {
        button.classList.add('incorrect');
      }
    });

    if (correct) {
      state.score += 1;
      state.successes += 1;
      if (!state.completed.includes(lesson.id)) {
        state.completed.push(lesson.id);
      }
      feedbackBox.textContent = `Bonne réponse ! ${lesson.hint}`;
      feedbackBox.className = 'feedback-box success';
    } else {
      feedbackBox.textContent = `Incorrect. ${lesson.hint}`;
      feedbackBox.className = 'feedback-box error';
    }

    saveState();
    updateStats();
    renderLessonList();
  }

  function nextLesson() {
    const visibleLessons = getVisibleLessons();
    if (!visibleLessons.length || currentIndex < 0) {
      return;
    }
    currentIndex = (currentIndex + 1) % visibleLessons.length;
    expandedChapter = visibleLessons[currentIndex].chapter;
    renderCurrentLesson();
  }

  function resetProgress() {
    state = { score: 0, successes: 0, completed: [] };
    saveState();
    render();
  }

  function render() {
    renderCategoryFilters();
    renderCurrentLesson();
  }

  function getAudioContext() {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      return null;
    }
    return new AudioCtor();
  }

  function playTone(noteName) {
    const ctx = getAudioContext();
    if (!ctx) {
      feedbackBox.textContent = 'Le navigateur ne prend pas en charge le synthétiseur audio.';
      return;
    }

    const frequencies = {
      do: 261.63,
      ré: 293.66,
      mi: 329.63,
      fa: 349.23,
      sol: 392.0,
      la: 440.0,
      si: 493.88
    };

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequencies[noteName] || 440;
    gain.gain.value = 0.12;

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.35);
  }

  loadState();
  nextLessonButton.addEventListener('click', nextLesson);
  resetProgressButton.addEventListener('click', resetProgress);

  if (lessons.length) {
    render();
  } else {
    lessonTitle.textContent = 'Aucune leçon disponible';
    feedbackBox.textContent = 'Le catalogue de cours est vide.';
  }
})();
