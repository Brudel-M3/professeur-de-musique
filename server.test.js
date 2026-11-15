const http = require('http');
const assert = require('assert');
const { createServer } = require('../server.js');

function request(server, path) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port: server.address().port,
      path,
      method: 'GET'
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body, headers: res.headers });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

(async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const health = await request(server, '/api/health');
    assert.strictEqual(health.statusCode, 200);
    assert.match(health.body, /"ok"\s*:\s*true/);

    const lessons = await request(server, '/api/lessons');
    assert.strictEqual(lessons.statusCode, 200);
    const parsedLessons = JSON.parse(lessons.body);
    assert.ok(Array.isArray(parsedLessons.lessons));
    assert.ok(parsedLessons.lessons.length > 0);
    assert.strictEqual(
      new Set(parsedLessons.lessons.map((lesson) => lesson.id)).size,
      parsedLessons.lessons.length,
      'les identifiants de leçon doivent être uniques'
    );
    parsedLessons.lessons.forEach((lesson) => {
      assert.ok(lesson.options.includes(lesson.answer), `${lesson.id}: la réponse doit faire partie des choix`);
      assert.strictEqual(
        lesson.options.filter((option) => option === lesson.answer).length,
        1,
        `${lesson.id}: la bonne réponse doit apparaître une seule fois`
      );
      assert.strictEqual(
        new Set(lesson.options).size,
        lesson.options.length,
        `${lesson.id}: les choix doivent être distincts`
      );
    });
    const cadenceLessons = parsedLessons.lessons.filter((lesson) => lesson.chapter === '11. La cadence');
    assert.strictEqual(cadenceLessons.length, 9);
    assert.deepStrictEqual(
      cadenceLessons.map((lesson) => lesson.id).sort(),
      [
        'cadence',
        'deceptive-cadence',
        'half-cadence',
        'imperfect-cadence',
        'plagal-cadence',
        'cadence-role',
        'perfect-cadence-criteria',
        'compare-cadences',
        'cadential-six-four'
      ].sort()
    );
    const secondaryDominantLessons = parsedLessons.lessons.filter(
      (lesson) => lesson.chapter === '12. Les dominantes secondaires'
    );
    assert.strictEqual(secondaryDominantLessons.length, 9);
    [
      'secondary-dominant',
      'secondary-dominant-notation',
      'secondary-dominant-v-v',
      'secondary-dominant-v-ii',
      'secondary-dominant-v7-vi',
      'secondary-dominant-resolution',
      'secondary-dominant-tendency-tones',
      'tonicization-vs-modulation',
      'identify-secondary-dominant'
    ].forEach((id) => {
      assert.ok(secondaryDominantLessons.some((lesson) => lesson.id === id), `cours manquant : ${id}`);
    });
    const voiceLeadingLessons = parsedLessons.lessons.filter(
      (lesson) => lesson.chapter === '13. La conduite des voix'
    );
    assert.strictEqual(voiceLeadingLessons.length, 9);
    [
      'voice-leading',
      'voice-leading-principle',
      'types-of-voice-motion',
      'contrary-motion',
      'parallel-octaves',
      'retain-common-tones',
      'tendency-tones-leading',
      'voice-crossing',
      'upper-voice-spacing'
    ].forEach((id) => {
      assert.ok(voiceLeadingLessons.some((lesson) => lesson.id === id), `cours manquant : ${id}`);
    });
    const noteLesson = parsedLessons.lessons.find((lesson) => lesson.id === 'notes');
    assert.strictEqual(noteLesson.chapter, '01. Les signes servant à écrire la musique');
    const notationLessonIds = [
      'notes', 'note-figures', 'relative-note-values', 'staff', 'note-position', 'ledger-lines',
      'treble-clef', 'bass-clef', 'c-clef', 'octave', 'stepwise-motion', 'accidentals',
      'natural-sign', 'key-accidental', 'double-accidentals', 'note-values', 'dotted-notes',
      'triplet', 'rests', 'half-rest', 'tie', 'barline'
    ];
    const notationLessons = parsedLessons.lessons.filter((lesson) => lesson.chapter === '01. Les signes servant à écrire la musique');
    assert.deepStrictEqual(notationLessons.map((lesson) => lesson.id).sort(), notationLessonIds.sort());
    const scaleIntervalLessons = parsedLessons.lessons.filter((lesson) => lesson.chapter === '02. La gamme et les intervalles');
    assert.ok(scaleIntervalLessons.length >= 10);
    assert.ok(scaleIntervalLessons.some((lesson) => lesson.id === 'major-scale'));
    assert.ok(scaleIntervalLessons.some((lesson) => lesson.id === 'intervals'));
    const tonalityLessons = parsedLessons.lessons.filter((lesson) => lesson.chapter === '03. Les tonalités');
    assert.ok(tonalityLessons.length >= 10);
    assert.ok(tonalityLessons.some((lesson) => lesson.id === 'keys'));
    assert.ok(tonalityLessons.some((lesson) => lesson.id === 'relative-minor'));
    assert.ok(tonalityLessons.some((lesson) => lesson.id === 'transposition'));
    const triadLessons = parsedLessons.lessons.filter((lesson) => lesson.chapter === '04. Les accords triades');
    assert.ok(triadLessons.length >= 8);
    assert.ok(triadLessons.some((lesson) => lesson.id === 'triads'));
    assert.ok(triadLessons.some((lesson) => lesson.id === 'diminished-triad'));
    const seventhChordLessons = parsedLessons.lessons.filter((lesson) => lesson.chapter === '05. Les accords de septième');
    assert.strictEqual(seventhChordLessons.length, 9);
    assert.ok(seventhChordLessons.some((lesson) => lesson.id === 'major-seventh-chord'));
    assert.ok(seventhChordLessons.some((lesson) => lesson.id === 'half-diminished-seventh'));
    const inversionLessons = parsedLessons.lessons.filter((lesson) => lesson.chapter === '06. Les renversements');
    assert.strictEqual(inversionLessons.length, 11);
    assert.ok(inversionLessons.some((lesson) => lesson.id === 'identify-first-inversion'));
    assert.ok(inversionLessons.some((lesson) => lesson.id === 'seventh-inversion-figures'));
    const harmonicFunctionLessons = parsedLessons.lessons.filter(
      (lesson) => lesson.chapter === '07. Les fonctions harmoniques'
    );
    assert.strictEqual(harmonicFunctionLessons.length, 10);
    [
      'harmonic-function-concept',
      'tonic-function',
      'dominant-function',
      'predominant-function',
      'functional-degree-groups',
      'identify-harmonic-function',
      'tonic-subdominant-dominant',
      'function-vs-chord-quality'
    ].forEach((id) => {
      assert.ok(harmonicFunctionLessons.some((lesson) => lesson.id === id), `cours manquant : ${id}`);
    });
    const rhythmLessons = parsedLessons.lessons.filter((lesson) => lesson.chapter === '08. Le rythme');
    assert.strictEqual(rhythmLessons.length, 9);
    [
      'rhythm',
      'pulse',
      'tempo',
      'rhythm-vs-pulse',
      'rhythmic-subdivision',
      'rhythmic-accent',
      'syncopation',
      'rhythmic-silence',
      'count-rhythm-pattern'
    ].forEach((id) => {
      assert.ok(rhythmLessons.some((lesson) => lesson.id === id), `cours manquant : ${id}`);
    });
    const meterLessons = parsedLessons.lessons.filter((lesson) => lesson.chapter === '09. La mesure');
    assert.strictEqual(meterLessons.length, 9);
    [
      'time-signature',
      'time-signature-reading',
      'simple-meters',
      'compound-meters',
      'simple-vs-compound-meter',
      'meter-accents',
      'barlines-and-measures',
      'complete-a-measure',
      'anacrusis'
    ].forEach((id) => {
      assert.ok(meterLessons.some((lesson) => lesson.id === id), `cours manquant : ${id}`);
    });
    const readingLessons = parsedLessons.lessons.filter((lesson) => lesson.chapter === '10. La lecture');
    assert.strictEqual(readingLessons.length, 9);
    [
      'note-names',
      'read-treble-lines',
      'read-treble-spaces',
      'read-bass-lines',
      'read-bass-spaces',
      'read-treble-sequence',
      'read-melodic-direction',
      'read-simultaneous-notes',
      'sight-reading-landmarks'
    ].forEach((id) => {
      assert.ok(readingLessons.some((lesson) => lesson.id === id), `cours manquant : ${id}`);
    });

    const home = await request(server, '/');
    assert.strictEqual(home.statusCode, 200);
    assert.match(home.body, /Professeur de musique/i);
    assert.match(home.body, /id="lesson-example"/);
    assert.match(home.body, /id="lesson-example-svg"[^>]*role="img"/);

    console.log('Tests OK');
  } finally {
    server.close();
  }
})();
