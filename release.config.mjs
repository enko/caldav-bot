/**
 * semantic-release: the version and the changelog are derived from the commit
 * messages, so CHANGELOG.md is generated - never edit it by hand.
 *
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  branches: ['main'],
  plugins: [
    // conventionalcommits preset rather than the default angular one: it is the
    // spec this repository's history follows, and `build:` commits land in the
    // notes instead of being dropped.
    //
    // conventional-changelog-conventionalcommits is pinned to the 8.x line on
    // purpose. 10.x targets @conventional-changelog/template, while
    // release-notes-generator 14 uses conventional-changelog-writer 8 - the
    // mismatch produces release notes containing nothing but the version
    // heading, with no error. Verified against this repository's history.
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          // A dependency bump that changes runtime behaviour is a patch for
          // whoever deploys the image, not an invisible chore.
          { type: 'build', scope: 'deps', release: 'patch' },
          { type: 'refactor', release: false },
          { type: 'docs', release: false },
        ],
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: {
          types: [
            { type: 'feat', section: 'Features' },
            { type: 'fix', section: 'Bug Fixes' },
            { type: 'build', section: 'Build & Dependencies' },
            { type: 'ci', section: 'Continuous Integration', hidden: true },
            { type: 'chore', hidden: true },
            { type: 'docs', hidden: true },
            { type: 'refactor', hidden: true },
            { type: 'test', hidden: true },
          ],
        },
      },
    ],
    '@semantic-release/changelog',
    // The package is never published: `private: true` in package.json makes this
    // plugin update the version field only and skip publishing.
    '@semantic-release/npm',
    '@semantic-release/github',
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'package-lock.json'],
        message:
          'chore(release): ${nextRelease.version}\n\n${nextRelease.notes}',
      },
    ],
  ],
};
