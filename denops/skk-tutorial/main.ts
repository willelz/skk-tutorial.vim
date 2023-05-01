/*
Copyright (C) 2023  willelz

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import { Denops, ensureArray, ensureString, execute } from "./deps.ts";
import { problems } from "./problems.ts";

const answerString = `>> 

* For next question ‘C-x n’
* to quit  ‘C-x q’
* to skip this question ‘C-x s’
`;

let tutorialNow = 0;
let tutorialAnswerBufName = "";
let tutorialProblemBufName = "";

export async function main(denops: Denops): Promise<void> {
  const updateAnswerField = async () => {
    //全行削除の警告抑制
    await denops.call(
      "appendbufline",
      tutorialAnswerBufName,
      "0",
      "",
    );
    await denops.call("deletebufline", tutorialAnswerBufName, 2, "$");
    await denops.call(
      "setbufline",
      tutorialAnswerBufName,
      1,
      answerString.split(/\r\n|\n/),
    );
    await denops.call(
      "appendbufline",
      tutorialAnswerBufName,
      "$",
      `SKKチュートリアル: [問${tutorialNow + 1}] (残り${
        problems.length - tutorialNow - 1
      }問)`,
    );
  };

  const updateProblemField = async () => {
    await denops.call("setbufvar", tutorialProblemBufName, "&modifiable", 1);
    //全行削除の警告抑制
    await denops.call(
      "appendbufline",
      tutorialProblemBufName,
      "0",
      "",
    );
    await denops.call("deletebufline", tutorialProblemBufName, 2, "$");
    await denops.call(
      "setbufline",
      tutorialProblemBufName,
      1,
      problems[tutorialNow].split(/\r\n|\n/),
    );
    await denops.call("setbufvar", tutorialProblemBufName, "&modifiable", 0);
  };
  denops.dispatcher = {
    async start(): Promise<void> {
      tutorialNow = 0;
      await denops.cmd("tabnew problem");
      await denops.cmd("set ft=skkTutorial");
      await denops.cmd("setl buftype=nofile");
      tutorialProblemBufName = ensureString(await denops.call("bufname"));
      await denops.cmd("split answer");
      await denops.cmd("set ft=skkTutorial");
      await denops.cmd(
        "autocmd InsertEnter * ++once syntax clear skkTutorialProblem",
      );
      await denops.cmd("setl buftype=nofile");
      tutorialAnswerBufName = ensureString(await denops.call("bufname"));
      await execute(
        denops,
        `
        nnoremap <buffer><silent> <C-x>n <cmd>call denops#request('${denops.name}', 'next', [])<CR>
        nnoremap <buffer><silent> <C-x>s <cmd>call denops#request('${denops.name}', 'skip', [])<CR>
        nnoremap <buffer><silent> <C-x>q <cmd>tabclose<CR>
        `,
      );

      await updateAnswerField();
      await updateProblemField();
    },

    async next(): Promise<void> {
      const answer = ensureString(
        ensureArray(
          await denops.call("getbufline", tutorialAnswerBufName, 1),
        )[0],
      );
      const correctAnswer = ensureString(
        ensureArray(
          await denops.call("getbufline", tutorialProblemBufName, "$"),
        )[0],
      );

      if (answer === correctAnswer) {
        if (tutorialNow + 1 === problems.length) {
          ending();
        } else {
          tutorialNow++;
          await updateAnswerField();
          await updateProblemField();
        }
      } else {
        await execute(
          denops,
          `
          echohl Error
          echo "Wrong. Try again"
          echohl none
          `,
        );
      }
    },
    async skip(): Promise<void> {
      if (tutorialNow + 1 === problems.length) {
        ending();
        return;
      }

      tutorialNow++;
      await updateAnswerField();
      await updateProblemField();
    },
  };

  const ending = async () => {
    const messase = `Now we end the SKK tutorial.

Please post comments, questions and bug reports on skk-tutorial.vim to:

https://github.com/willelz/skk-tutorial.vim

!! Hit <return> key whrn you are ready.`;
    await execute(
      denops,
      `
      split ending
      set buftype=nofile
      set ft=skkTutorial
      bdelete answer
      bdelete problem
      `,
    );
    await denops.call("setline", 1, messase.split(/\r\n|\n/));
    await denops.cmd(`nnoremap <buffer><silent> <CR> <cmd>bdelete<CR>`);
  };

  await denops.cmd(
    `command! SKKTutorialStart call denops#request('${denops.name}', 'start', [])`,
  );
}
