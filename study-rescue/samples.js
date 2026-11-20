/* Sample study material, written for the demo. Labeled as a sample everywhere it shows. */
(function (root) {
  var SAMPLES = {
    biology: {
      subject: 'Biology',
      name: 'Sample: Biology unit 3 notes',
      text: [
        'Biology Unit 3: Cells and Energy',
        '',
        'Cell structure',
        '- The cell membrane is a thin layer that controls what enters and leaves the cell.',
        '- The nucleus is the part of the cell that holds the DNA.',
        '- Mitochondria are organelles that release energy from food through cellular respiration.',
        '- Ribosomes are small structures that build proteins.',
        'Plant cells also have a cell wall and chloroplasts. Animal cells do not have a cell wall.',
        '',
        'Moving materials',
        'Diffusion is the movement of particles from an area of high concentration to an area of low concentration.',
        'Osmosis is the diffusion of water across a selectively permeable membrane.',
        'Active transport is movement that uses energy to move particles against the concentration gradient.',
        'A cell placed in very salty water loses water by osmosis and shrinks.',
        '',
        'Photosynthesis',
        'Photosynthesis is the process plants use to turn light energy into chemical energy stored in glucose.',
        'Photosynthesis takes place in the chloroplasts of plant cells.',
        'Chlorophyll is the green pigment that absorbs light for photosynthesis.',
        'The inputs of photosynthesis are carbon dioxide, water and light. The outputs are glucose and oxygen.',
        '',
        'Cellular respiration',
        'Cellular respiration is the process cells use to release energy from glucose.',
        'Aerobic respiration needs oxygen and produces carbon dioxide and water.',
        'ATP is the molecule cells use to carry energy for their work.',
        'Fermentation is a way to release energy from glucose without oxygen.',
        '',
        'Cell division',
        'Mitosis is cell division that makes two identical body cells.',
        'Meiosis is cell division that makes sex cells with half the usual number of chromosomes.',
        'Chromosomes are long strands of DNA wrapped around proteins.',
        'Before a cell divides, it copies its DNA.'
      ].join('\n')
    },
    history: {
      subject: 'US History',
      name: 'Sample: US government study guide',
      text: [
        '# The US Constitution',
        'The Constitution is the supreme law of the United States.',
        'It was signed in 1787 at the Constitutional Convention in Philadelphia.',
        'The Preamble is the opening sentence that states the goals of the Constitution.',
        'The Bill of Rights is the first ten amendments to the Constitution.',
        '',
        '# Three branches',
        'The legislative branch is Congress, which makes the laws.',
        'Congress has two parts: the Senate and the House of Representatives.',
        'The executive branch is led by the President and carries out the laws.',
        'The judicial branch is the court system, led by the Supreme Court, which interprets the laws.',
        '',
        '# Checks and balances',
        'Checks and balances is the system that lets each branch limit the power of the other branches.',
        'A veto is the power of the President to reject a bill passed by Congress.',
        'Congress can override a veto with a two-thirds vote in both the Senate and the House.',
        'Judicial review is the power of courts to decide whether a law follows the Constitution.',
        '',
        '# Federalism',
        'Federalism is the sharing of power between the national government and the states.',
        'Powers given only to the national government are called delegated powers.',
        'Powers kept by the states are called reserved powers.'
      ].join('\n')
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = SAMPLES; else root.SRSamples = SAMPLES;
})(typeof self !== 'undefined' ? self : this);
