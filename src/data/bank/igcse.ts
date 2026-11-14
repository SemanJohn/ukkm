import { build, type Raw } from './helpers';

/**
 * Latihan Ujian Khas IGCSE — cadangan latihan sahaja (format rasmi tidak diterbitkan oleh MARA).
 * Item dalam Bahasa Inggeris: 80 English + 40 Mathematics/Science in English. Belum disemak guru.
 */
const GR = 'Grammar';
const VO = 'Vocabulary';
const RC = 'Reading Comprehension';
const ME = 'Mathematics in English';
const SE = 'Science in English';

const C = 'Choose the correct answer to complete the sentence.\n\n';

const R1 =
  'Read the passage below.\n\nEvery Saturday morning, Aiman helps his grandmother at her small stall in the night market car park. She sells fried bananas and sweet potato balls. Aiman arranges the paper bags, counts the change and greets the customers. Last month, he suggested adding a sign with the prices written in large numbers. Since then, customers no longer need to ask how much each item costs, and the queue moves much faster. His grandmother now saves about twenty minutes every morning, which she uses to prepare a second batch of banana fritters.\n\n';
const R2 =
  'Read the passage below.\n\nMangrove trees grow along muddy coasts where the sea meets the land. Their tangled roots stand above the water like stilts. These roots slow down waves, so villages behind a mangrove forest are better protected during storms. The roots also trap mud and give young fish, crabs and prawns a safe place to hide from larger animals. However, many mangrove forests have been cleared to build ponds and houses. In some villages, pupils now plant mangrove seedlings during low tide to replace the trees that were lost.\n\n';
const R3 =
  'Read the notice below.\n\nSCHOOL LIBRARY NOTICE\nThe library will be closed from Monday to Wednesday next week for repainting. All books borrowed before the closure must be returned by this Friday. Pupils who return books late will not be allowed to borrow new books for two weeks. During the closure, pupils may read at the reading corner beside the canteen, where two shelves of magazines and storybooks will be placed. The library will reopen on Thursday with a new section for science comics.\n\n';
const R4 =
  'Read the passage below.\n\nWhen Mei Ling first joined the school robotics club, she was afraid to touch the robot in case she broke it. She watched quietly while the older pupils connected the wires and wrote the program. One afternoon, the robot kept turning left instead of moving straight. Nobody could find the mistake. Mei Ling noticed that one wheel was slightly loose and pointed it out in a small voice. The team tightened the wheel and the robot ran perfectly. From that day on, Mei Ling was no longer just a spectator; the team asked for her opinion before every test run.\n\n';

export const igcseRaws: Raw[] = [
  // ---------- Grammar (32) ----------
  [GR, 'e', C + 'My sister ___ to school by bus every day.', ['goes', 'go', 'going', 'gone'], 'A singular subject (“my sister”) in the simple present takes the verb with -es: “goes”.'],
  [GR, 'e', C + 'There ___ three apples on the table.', ['are', 'is', 'am', 'be'], '“Three apples” is plural, so the verb is “are”.'],
  [GR, 'e', C + 'We ___ football in the field yesterday evening.', ['played', 'play', 'playing', 'plays'], '“Yesterday evening” shows past time, so the simple past “played” is used.'],
  [GR, 'e', C + 'This is ___ umbrella I borrowed from the teacher.', ['the', 'an', 'a', 'some'], 'The umbrella is a specific one (the one I borrowed), so the definite article “the” is used.'],
  [GR, 'e', C + 'The cat is hiding ___ the bed.', ['under', 'between', 'among', 'into'], '“Under” shows a position below something.'],
  [GR, 'e', C + 'Farah has two brothers. ___ names are Adam and Irfan.', ['Their', 'They', 'Them', 'Theirs'], 'A possessive adjective is needed before the noun “names”: “their”.'],
  [GR, 'e', C + 'I would like ___ orange, please.', ['an', 'a', 'the two', 'any'], '“Orange” begins with a vowel sound, so “an” is used.'],
  [GR, 'm', C + 'She ___ her homework when the lights went out.', ['was doing', 'is doing', 'does', 'has done'], 'An action in progress in the past that was interrupted uses the past continuous: “was doing”.'],
  [GR, 'm', C + 'Neither Ali nor his friends ___ late for the bus this morning.', ['were', 'was', 'is', 'has'], 'With “neither … nor”, the verb agrees with the nearer subject (“his friends”, plural): “were”.'],
  [GR, 'm', C + 'This is the ___ story I have ever read.', ['funniest', 'funnier', 'most funny', 'more funny'], 'The superlative of “funny” is “funniest”; “ever” signals a superlative.'],
  [GR, 'm', C + 'We have lived in this town ___ 2019.', ['since', 'for', 'from', 'during'], '“Since” is used with a starting point in time; “for” is used with a length of time.'],
  [GR, 'm', C + 'If it rains tomorrow, we ___ the picnic.', ['will cancel', 'cancelled', 'would cancel', 'cancel'], 'First conditional: “if” + simple present, “will” + base verb.'],
  [GR, 'm', C + 'He ran ___ to catch the last train.', ['quickly', 'quick', 'quicker than', 'quickness'], 'An adverb is needed to describe the verb “ran”: “quickly”.'],
  [GR, 'm', C + 'How ___ sugar do you need for the cake?', ['much', 'many', 'few', 'several'], '“Sugar” is uncountable, so “much” is used.'],
  [GR, 'm', C + 'The pupils ___ already finished their project.', ['have', 'has', 'is', 'was'], '“The pupils” is plural, and the present perfect needs “have” + past participle.'],
  [GR, 'm', C + 'Puan Rani asked us ___ quietly in the hall.', ['to sit', 'sitting', 'sat', 'sits'], 'After “ask someone”, the infinitive with “to” is used.'],
  [GR, 'm', C + 'The book ___ is on the desk belongs to Zara.', ['that', 'who', 'whose', 'whom'], '“That” (or “which”) is the relative pronoun used for things.'],
  [GR, 'm', C + 'She is good ___ drawing animals.', ['at', 'in', 'on', 'with'], 'The fixed expression is “good at” + noun or -ing form.'],
  [GR, 'm', C + 'You ___ wear a helmet when you ride a motorcycle. It is the law.', ['must', 'might', 'could', 'would'], '“Must” shows obligation, which fits a law.'],
  [GR, 'm', C + 'I was tired, ___ I went to bed early.', ['so', 'but', 'because', 'although'], '“So” introduces a result.'],
  [GR, 'm', 'Which sentence is correct?', ['She does not like spicy food.', 'She do not like spicy food.', 'She does not likes spicy food.', 'She not like spicy food.'], 'With “she”, the negative is “does not” followed by the base verb “like”.'],
  [GR, 'm', 'Which sentence is punctuated correctly?', ['“Where are you going?” asked Hana.', '“Where are you going”? asked Hana.', 'Where are you going? “asked Hana.”', '“Where are you going,” asked Hana?'], 'The question mark goes inside the quotation marks, the first word is capitalised, and “asked” is not capitalised.'],
  [GR, 'h', C + 'By the time we arrived, the film ___.', ['had already started', 'has already started', 'already starts', 'was already start'], 'An action completed before another past action uses the past perfect: “had started”.'],
  [GR, 'h', C + 'The letters ___ by the clerk every morning.', ['are sorted', 'sorts', 'are sorting', 'sorted are'], 'The letters receive the action, so the passive voice “are sorted” is needed.'],
  [GR, 'h', C + 'If I ___ a bird, I would fly over the mountains.', ['were', 'am', 'will be', 'have been'], 'Second conditional (an unreal situation): “if” + past form (“were”), “would” + base verb.'],
  [GR, 'h', C + 'Hardly anyone came to the meeting, ___?', ['did they', 'didn’t they', 'did he', 'wasn’t it'], '“Hardly anyone” is negative in meaning, so the question tag is positive: “did they”.'],
  [GR, 'h', C + '___ it was raining heavily, the match continued.', ['Although', 'Because', 'Unless', 'Therefore'], '“Although” shows contrast between the rain and the match continuing.'],
  [GR, 'h', C + 'Each of the players ___ a medal after the final.', ['was given', 'were given', 'have given', 'are giving'], '“Each” is singular, so “was given” is correct.'],
  [GR, 'h', 'Choose the sentence that has the same meaning as: “Dina said, ‘I am reading a novel.’”', ['Dina said that she was reading a novel.', 'Dina said that I am reading a novel.', 'Dina said that she is read a novel.', 'Dina says that she had read a novel.'], 'In reported speech, “I” becomes “she” and the present continuous moves back to the past continuous.'],
  [GR, 'h', C + 'I look forward to ___ from you soon.', ['hearing', 'hear', 'heard', 'be heard'], 'After “look forward to”, the -ing form is used because “to” is a preposition here.'],
  [GR, 'a', 'Which sentence is grammatically correct?', ['Not only did he win the race, but he also broke the record.', 'Not only he won the race, but also broke he the record.', 'Not only did he won the race, but he also broke the record.', 'Not only he did win the race, also he broke the record.'], 'When “not only” starts a sentence, the auxiliary comes before the subject (“did he win”), and the main verb stays in base form.'],
  [GR, 'a', C + 'The teacher suggested that Imran ___ his essay again before handing it in.', ['check', 'checks', 'checked has', 'is checking'], 'After “suggested that”, the base form (subjunctive) is used: “that Imran check”.'],

  // ---------- Vocabulary (24) ----------
  [VO, 'e', 'Which word is the opposite of “ancient”?', ['modern', 'old', 'huge', 'quiet'], '“Ancient” means very old; its opposite is “modern”.'],
  [VO, 'e', 'Which word has the same meaning as “begin”?', ['start', 'finish', 'stop', 'wait'], '“Begin” and “start” are synonyms.'],
  [VO, 'e', 'A person who repairs cars is called a ___.', ['mechanic', 'pilot', 'tailor', 'baker'], 'A mechanic repairs vehicles and engines.'],
  [VO, 'e', 'Which word means “not costing a lot of money”?', ['cheap', 'heavy', 'narrow', 'rare'], '“Cheap” means low in price.'],
  [VO, 'e', 'We keep milk in the ___ so that it stays cold.', ['refrigerator', 'cupboard', 'oven', 'drawer'], 'A refrigerator keeps food and drinks cold.'],
  [VO, 'm', 'Which word is closest in meaning to “enormous”?', ['huge', 'tiny', 'smooth', 'bright'], '“Enormous” means very large, like “huge”.'],
  [VO, 'm', 'Which word is the opposite of “generous”?', ['selfish', 'kind', 'cheerful', 'honest'], 'A generous person shares; a selfish person does not.'],
  [VO, 'm', C + 'The road was ___ after the heavy rain, so the cars moved slowly.', ['slippery', 'crowded', 'narrow', 'dusty'], 'Rain makes a road wet and slippery.'],
  [VO, 'm', 'In the sentence “The explorer was exhausted after the long climb”, the word “exhausted” means', ['very tired', 'very excited', 'slightly hungry', 'completely lost'], '“Exhausted” means extremely tired.'],
  [VO, 'm', 'Which word best completes the pair? “Doctor is to hospital as teacher is to ___.”', ['school', 'lesson', 'pupil', 'book'], 'A doctor works in a hospital; a teacher works in a school.'],
  [VO, 'm', 'What does the idiom “a piece of cake” mean?', ['Something very easy', 'Something very sweet', 'A small reward', 'A short break'], 'The idiom describes a task that is very easy to do.'],
  [VO, 'm', 'Which word describes someone who is afraid to speak to new people?', ['shy', 'proud', 'rude', 'brave'], 'A shy person feels nervous with people they do not know.'],
  [VO, 'm', C + 'The scientist made an important ___ about how plants grow in the dark.', ['discovery', 'decoration', 'direction', 'delivery'], 'A “discovery” is something found out for the first time.'],
  [VO, 'm', 'Which prefix can be added to “possible” to make its opposite?', ['im-', 'un-', 'dis-', 'mis-'], 'The opposite of “possible” is “impossible”.'],
  [VO, 'm', 'Which word is a noun formed from the verb “decide”?', ['decision', 'decisive', 'decided', 'decidedly'], '“Decision” is the noun; “decisive” is an adjective and “decidedly” an adverb.'],
  [VO, 'h', 'Which word is closest in meaning to “reluctant”?', ['unwilling', 'eager', 'careless', 'grateful'], '“Reluctant” means not wanting to do something.'],
  [VO, 'h', 'What does the phrase “to keep an eye on” something mean?', ['To watch it carefully', 'To close one eye', 'To forget about it', 'To look at it once'], 'The phrase means to watch or look after something.'],
  [VO, 'h', C + 'The instructions were so ___ that nobody understood what to do.', ['vague', 'precise', 'brief', 'obvious'], '“Vague” means unclear, which explains why nobody understood.'],
  [VO, 'h', 'In which sentence is the word “light” used to mean “not heavy”?', ['The empty box was light enough for the child to carry.', 'Please switch on the light.', 'She wore a light blue dress.', 'They light the candles at night.'], 'Only in the first sentence does “light” describe weight.'],
  [VO, 'h', 'Which word best replaces “happy” to show a much stronger feeling?', ['delighted', 'pleased', 'calm', 'fine'], '“Delighted” means extremely happy; “pleased” is weaker.'],
  [VO, 'h', 'Which pair of words are homophones (same sound, different meaning)?', ['flour – flower', 'quiet – quite', 'lose – loose', 'desert – dessert'], '“Flour” and “flower” are pronounced the same. The other pairs are pronounced differently.'],
  [VO, 'h', 'A “drought” is a long period', ['without rain', 'of very cold weather', 'of strong wind', 'without sunlight'], 'A drought is a long time with little or no rain.'],
  [VO, 'a', 'Which word best completes the sentence? “Although the plan looked simple, carrying it out proved to be ___.”', ['challenging', 'effortless', 'ordinary', 'pleasant'], '“Although” signals a contrast with “simple”, so the answer is “challenging”.'],
  [VO, 'a', 'In “The mayor’s speech was met with scattered applause”, the word “scattered” suggests that', ['only a few people clapped', 'everyone clapped loudly', 'people threw things', 'the clapping lasted a long time'], '“Scattered” means spread out and few, so only some people clapped.'],

  // ---------- Reading Comprehension (24) ----------
  [RC, 'e', R1 + 'What does Aiman’s grandmother sell?', ['Fried bananas and sweet potato balls', 'Paper bags and signs', 'Fresh bananas and potatoes', 'Drinks and noodles'], 'The passage says she sells fried bananas and sweet potato balls.'],
  [RC, 'e', R1 + 'When does Aiman help at the stall?', ['Every Saturday morning', 'Every night', 'Every school day', 'Once a month'], 'The first sentence states “Every Saturday morning”.'],
  [RC, 'm', R1 + 'What was Aiman’s suggestion?', ['To put up a sign showing the prices', 'To sell a new kind of snack', 'To move the stall to another place', 'To lower the prices'], 'He suggested adding a sign with the prices written in large numbers.'],
  [RC, 'm', R1 + 'Why does the queue move faster now?', ['Customers can see the prices without asking', 'There are fewer customers', 'Aiman serves two customers at once', 'The food is cooked the night before'], 'Customers no longer need to ask how much each item costs.'],
  [RC, 'h', R1 + 'How does the grandmother use the time she saves?', ['She prepares more banana fritters', 'She rests before the market opens', 'She counts the change', 'She writes new signs'], 'She uses the time to prepare a second batch of banana fritters.'],
  [RC, 'h', R1 + 'Which word best describes Aiman?', ['Helpful', 'Lazy', 'Careless', 'Shy'], 'He helps every week and thinks of a way to improve the stall.'],
  [RC, 'e', R2 + 'Where do mangrove trees grow?', ['Along muddy coasts', 'On high mountains', 'In dry deserts', 'In the middle of cities'], 'The passage says they grow along muddy coasts where the sea meets the land.'],
  [RC, 'm', R2 + 'How do mangrove roots protect villages?', ['They slow down the waves', 'They stop the rain', 'They make the water deeper', 'They block the wind completely'], 'The roots slow down waves, so villages behind them are better protected.'],
  [RC, 'm', R2 + 'Why are mangrove roots important to young fish?', ['They give the fish a safe place to hide', 'They provide the fish with fruit', 'They keep the water warm', 'They carry the fish out to sea'], 'Young fish, crabs and prawns hide among the roots from larger animals.'],
  [RC, 'm', R2 + 'Why have many mangrove forests been cleared?', ['To build ponds and houses', 'To plant new seedlings', 'To protect villages from storms', 'To catch more crabs'], 'The passage states they were cleared to build ponds and houses.'],
  [RC, 'h', R2 + 'The roots are compared to “stilts” because they', ['stand above the water like long legs', 'are made of wood by villagers', 'move with the waves', 'are hidden under the mud'], 'Stilts are long poles that hold something up; the roots stand above the water in the same way.'],
  [RC, 'a', R2 + 'What is the most likely reason the seedlings are planted during low tide?', ['The mud is uncovered, so pupils can reach it', 'The waves are strongest then', 'Fish eat the seedlings at high tide', 'Seedlings only grow at night'], 'At low tide the water moves back and the muddy ground can be reached. This is an inference from the passage.'],
  [RC, 'e', R3 + 'Why will the library be closed?', ['For repainting', 'For a book sale', 'For school holidays', 'For a science exhibition'], 'The notice says it will be closed for repainting.'],
  [RC, 'e', R3 + 'By when must borrowed books be returned?', ['This Friday', 'Next Monday', 'Next Wednesday', 'Next Thursday'], 'Books must be returned “by this Friday”.'],
  [RC, 'm', R3 + 'What happens to pupils who return books late?', ['They cannot borrow new books for two weeks', 'They must pay a fine', 'They must help repaint the library', 'They cannot enter the reading corner'], 'Late pupils will not be allowed to borrow new books for two weeks.'],
  [RC, 'm', R3 + 'Where can pupils read while the library is closed?', ['At the reading corner beside the canteen', 'In the science laboratory', 'In the school hall', 'In their own classrooms only'], 'The notice mentions the reading corner beside the canteen.'],
  [RC, 'm', R3 + 'For how many days will the library be closed?', ['Three', 'Two', 'Four', 'Five'], 'Monday, Tuesday and Wednesday are three days.'],
  [RC, 'h', R3 + 'What will be new when the library reopens?', ['A section for science comics', 'Two shelves of magazines', 'A reading corner', 'A different librarian'], 'It will reopen with a new section for science comics. The magazine shelves are only at the temporary reading corner.'],
  [RC, 'e', R4 + 'Which club did Mei Ling join?', ['The robotics club', 'The science club', 'The chess club', 'The art club'], 'The first sentence says she joined the school robotics club.'],
  [RC, 'm', R4 + 'Why did Mei Ling not touch the robot at first?', ['She was afraid of breaking it', 'She was not allowed to', 'She did not like robots', 'She arrived late to the club'], 'She was afraid to touch it “in case she broke it”.'],
  [RC, 'm', R4 + 'What was wrong with the robot?', ['One wheel was slightly loose', 'The program was missing', 'A wire was cut', 'The battery was flat'], 'Mei Ling noticed that one wheel was slightly loose.'],
  [RC, 'h', R4 + 'What does the word “spectator” mean in the passage?', ['Someone who only watches', 'Someone who leads a team', 'Someone who repairs things', 'Someone who writes programs'], 'A spectator watches without taking part, as Mei Ling did at first.'],
  [RC, 'h', R4 + 'How did the team’s attitude towards Mei Ling change?', ['They began to ask for her opinion', 'They asked her to leave the team', 'They let her write the whole program', 'They stopped testing the robot'], 'After she found the fault, the team asked for her opinion before every test run.'],
  [RC, 'a', R4 + 'What is the main message of the passage?', ['Careful observation can be a valuable contribution', 'Robots are too difficult for young pupils', 'Older pupils always know best', 'Speaking loudly is the way to be heard'], 'Mei Ling’s quiet but careful observation solved the problem and earned the team’s respect.'],

  // ---------- Mathematics in English (20) ----------
  [ME, 'e', 'What is the sum of 248 and 157?', ['405', '395', '415', '91'], '“Sum” means the result of adding: 248 + 157 = 405.'],
  [ME, 'e', 'What is the product of 12 and 9?', ['108', '21', '98', '3'], '“Product” means the result of multiplying: 12 × 9 = 108.'],
  [ME, 'e', 'Which of these numbers is an even number?', ['76', '53', '91', '37'], 'An even number can be divided by 2 exactly; 76 ÷ 2 = 38.'],
  [ME, 'e', 'What is the difference between 900 and 365?', ['535', '545', '1265', '635'], '“Difference” means the result of subtracting: 900 − 365 = 535.'],
  [ME, 'm', 'A rectangle has a length of 14 cm and a width of 6 cm. What is its perimeter?', ['40 cm', '84 cm', '20 cm', '34 cm'], 'Perimeter = 2 × (length + width) = 2 × 20 = 40 cm.'],
  [ME, 'm', 'What is one quarter of 360?', ['90', '120', '180', '36'], 'One quarter means dividing by 4: 360 ÷ 4 = 90.'],
  [ME, 'm', 'Which fraction is equivalent to 0.75?', ['3/4', '7/5', '1/75', '3/5'], '0.75 = 75/100 = 3/4.'],
  [ME, 'm', 'A bus leaves at 9:40 a.m. and arrives at 11:15 a.m. How long is the journey?', ['1 hour 35 minutes', '2 hours 25 minutes', '1 hour 25 minutes', '1 hour 45 minutes'], 'From 9:40 to 10:40 is 1 hour, and from 10:40 to 11:15 is 35 minutes.'],
  [ME, 'm', 'What is the remainder when 47 is divided by 6?', ['5', '7', '1', '4'], '6 × 7 = 42 and 47 − 42 = 5.'],
  [ME, 'm', 'Which number is a multiple of both 4 and 6?', ['36', '16', '18', '30'], '36 = 4 × 9 and 36 = 6 × 6. The others are not multiples of both.'],
  [ME, 'm', 'A square has an area of 49 square centimetres. What is the length of one side?', ['7 cm', '12.25 cm', '24.5 cm', '14 cm'], 'Area of a square = side × side, and 7 × 7 = 49.'],
  [ME, 'm', 'The mean (average) of 6, 9, 10 and 15 is', ['10', '40', '9.5', '15'], 'Mean = (6 + 9 + 10 + 15) ÷ 4 = 40 ÷ 4 = 10.'],
  [ME, 'h', 'A shirt costs RM80. It is sold at a discount of 15%. What is the selling price?', ['RM68', 'RM65', 'RM12', 'RM92'], '15% of RM80 is RM12, and RM80 − RM12 = RM68.'],
  [ME, 'h', 'The ratio of boys to girls in a class is 3 : 5. There are 15 boys. How many pupils are in the class altogether?', ['40', '25', '24', '45'], 'One part is 15 ÷ 3 = 5 pupils. Total parts = 8, so 8 × 5 = 40 pupils.'],
  [ME, 'h', 'A tank holds 2.4 litres of water. How many 300-millilitre cups can be filled completely?', ['8', '7', '80', '12'], '2.4 litres = 2400 ml, and 2400 ÷ 300 = 8.'],
  [ME, 'h', 'Which number is a prime number?', ['47', '51', '49', '57'], '47 has no factors other than 1 and itself. 51 = 3 × 17, 49 = 7 × 7 and 57 = 3 × 19.'],
  [ME, 'h', 'A car travels 150 km in 2 hours 30 minutes. What is its average speed?', ['60 km/h', '75 km/h', '65 km/h', '50 km/h'], 'Speed = distance ÷ time = 150 ÷ 2.5 = 60 km/h.'],
  [ME, 'h', 'Three consecutive whole numbers add up to 72. What is the largest of the three numbers?', ['25', '24', '23', '26'], 'The middle number is 72 ÷ 3 = 24, so the numbers are 23, 24 and 25.'],
  [ME, 'a', 'Sara is twice as old as her brother. In 6 years, the sum of their ages will be 36. How old is Sara now?', ['16', '12', '8', '20'], 'Now their ages add up to 36 − 12 = 24. Brother = 8 and Sara = 16.'],
  [ME, 'a', 'A number is doubled and then 7 is subtracted. The result is 29. What is the number?', ['18', '11', '36', '15'], 'Work backwards: 29 + 7 = 36, and 36 ÷ 2 = 18.'],

  // ---------- Science in English (20) ----------
  [SE, 'e', 'Which part of a plant absorbs water from the soil?', ['The roots', 'The leaves', 'The flowers', 'The fruit'], 'Roots take in water and mineral salts from the soil.'],
  [SE, 'e', 'Which of these is a source of light?', ['The Sun', 'The Moon', 'A mirror', 'A window'], 'The Sun gives out its own light. The Moon and a mirror only reflect light.'],
  [SE, 'e', 'What do we call an animal that eats only plants?', ['A herbivore', 'A carnivore', 'An omnivore', 'A predator'], 'A herbivore eats only plants.'],
  [SE, 'e', 'Which state of matter has a fixed shape?', ['Solid', 'Liquid', 'Gas', 'Steam'], 'A solid keeps its own shape; liquids and gases take the shape of their container.'],
  [SE, 'm', 'What is the process called when water changes into water vapour?', ['Evaporation', 'Condensation', 'Freezing', 'Melting'], 'Evaporation is the change from liquid to gas.'],
  [SE, 'm', 'Which gas do plants take in during photosynthesis?', ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Hydrogen'], 'Plants use carbon dioxide, water and sunlight to make food, and release oxygen.'],
  [SE, 'm', 'Which of these materials is a good conductor of electricity?', ['Copper', 'Rubber', 'Glass', 'Wood'], 'Metals such as copper allow electricity to flow through them easily.'],
  [SE, 'm', 'The Earth takes about 24 hours to', ['rotate once on its axis', 'travel once around the Sun', 'travel once around the Moon', 'change from one season to the next'], 'One rotation of the Earth on its axis takes about 24 hours and causes day and night.'],
  [SE, 'm', 'Which organ pumps blood around the human body?', ['The heart', 'The lungs', 'The stomach', 'The brain'], 'The heart pumps blood through the blood vessels.'],
  [SE, 'm', 'A food chain usually begins with', ['a plant', 'a carnivore', 'a herbivore', 'a decomposer'], 'Plants are producers; they make their own food and start the food chain.'],
  [SE, 'm', 'Which force pulls objects towards the centre of the Earth?', ['Gravity', 'Friction', 'Magnetism', 'Air resistance'], 'Gravity is the force that pulls objects towards the Earth.'],
  [SE, 'm', 'Which of these is a way to slow down the rusting of iron?', ['Painting it', 'Wetting it', 'Leaving it outdoors', 'Scratching its surface'], 'Paint keeps water and air away from the iron, so it rusts more slowly.'],
  [SE, 'h', 'A pupil wants to find out whether the amount of water affects how tall a bean plant grows. What should the pupil change?', ['The amount of water given to each plant', 'The type of plant', 'The size of the pots', 'The place where the plants are kept'], 'The variable that is changed on purpose is the one being investigated: the amount of water.'],
  [SE, 'h', 'Why does a metal spoon feel colder than a wooden spoon in the same room?', ['Metal conducts heat away from the hand faster', 'Metal is always at a lower temperature', 'Wood produces its own heat', 'Metal contains more water'], 'Both spoons are at room temperature, but metal is a better conductor and takes heat from the hand more quickly.'],
  [SE, 'h', 'Which change is a chemical change?', ['Burning paper', 'Melting ice', 'Cutting cloth', 'Dissolving salt in water'], 'Burning produces new substances (ash and gases). The other changes do not produce a new substance.'],
  [SE, 'h', 'During a lunar eclipse, which object is in the middle?', ['The Earth', 'The Moon', 'The Sun', 'A comet'], 'In a lunar eclipse, the Earth is between the Sun and the Moon and its shadow falls on the Moon.'],
  [SE, 'h', 'Why do we see lightning before we hear thunder?', ['Light travels faster than sound', 'Sound travels faster than light', 'Thunder happens later than lightning', 'Clouds block the sound'], 'Both happen at the same time, but light reaches us almost instantly while sound travels much more slowly.'],
  [SE, 'h', 'Which of these is an example of a renewable energy source?', ['Wind', 'Coal', 'Petroleum', 'Natural gas'], 'Wind will not run out. Coal, petroleum and natural gas are fossil fuels.'],
  [SE, 'a', 'Two identical ice cubes are placed in two glasses. One glass is wrapped in a thick cloth. The ice in the wrapped glass melts more slowly. What is the best conclusion?', ['The cloth slows the flow of heat into the glass', 'The cloth makes the ice colder', 'The cloth absorbs the water', 'Ice melts more slowly in the dark'], 'The cloth is an insulator, so heat from the surroundings reaches the ice more slowly.'],
  [SE, 'a', 'A population of frogs in a pond suddenly falls. Which change is most likely to follow in the food chain “algae → insects → frogs → snakes”?', ['The number of insects increases', 'The number of insects decreases', 'The number of snakes increases', 'The amount of algae increases'], 'With fewer frogs to eat them, the insects increase. Snakes would have less food, and more insects would eat more algae.'],
];

export const igcseBank = build('igcse', 'IG', igcseRaws);
