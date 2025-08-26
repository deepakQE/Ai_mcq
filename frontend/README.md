# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## MCQ Generator Pro - Additional Notes

This fork adds "Pro" features on top of the base app:

- Polished UI using Tailwind CSS.
- Interactive quiz behavior with selectable answers and immediate feedback.
- Per-quiz scoring and progress display.
- Export quiz and results to JSON.
- Local generator fallback when backend is unavailable.
- Options to shuffle questions, mix difficulty, and enable/disable immediate feedback.

Important behavior notes:

- Immediate feedback mode: when enabled (toggle in the controls), selecting an answer shows the correct/incorrect state and will auto-advance to the next question after a short delay (600ms). Immediate feedback is OFF by default — the app uses manual navigation (Next/Prev) so you can control pacing.

- To use manual pacing: ensure "Immediate feedback" is unchecked in the control panel, then select answers and navigate using Next/Prev.

- If you manually click Next/Prev while an auto-advance timer is pending, the app cancels the pending auto-advance to avoid double navigation.

- Use the "Export JSON" button to save the current generated question set. From the Summary screen you can also export quiz results.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature.

## Troubleshooting

If you run into PostCSS/Tailwind issues (older Tailwind versions), remove node_modules and package-lock.json then run `npm install` again.

If you see an accessibility/screen reader warning in PowerShell about PSReadLine, run `Import-Module PSReadLine` in PowerShell to re-enable it.
