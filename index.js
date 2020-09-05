/* eslint-disable camelcase */
const cron = require('node-cron');
const superagent = require('superagent');
const simpleGit = require('simple-git');
const fs = require('fs');
const moment = require('moment');
const _ = require('lodash');

const git = simpleGit({
	baseDir: process.cwd(),
	binary: 'git',
	maxConcurrentProcesses: 6,
});
const runs = require('./data/runs');
const repos = require('./data/repos');
const reposTemplate = require('./templates/reposTemplate');
const readmeTemplate = require('./templates/readmeTemplate');
const footerTemplate = require('./templates/footerTemplate');

const today = moment().format('YYYY-MM-DD').toString();

function fetchRepos(topics = ['devstree'], appName = 'aramrafeq', lastRun = '2015-11-01') {
	const url = 'https://api.github.com/search/repositories';
	const params = {
		// q: `topic:devstree+is:public+archived:false+created:>2015-11-01`,
		sort: 'stars',
		order: 'desc',
	};

	return superagent
		.get(`${url}?q=topic:${topics[0]}+is:public+archived:false+created:>${lastRun}`)
		.query(params)
		.set('User-Agent', appName)
		.then((res) => {
			const { body } = res;

			const remoteRepos = body.items.map((repo) => {
				const {
					full_name,
					name,
					html_url,
					description,
					contributors_url,
					stargazers_count,

				} = repo;
				return {
					full_name,
					name,
					html_url,
					description,
					contributors_url,
					stargazers_count,
					owner_avatar_url: repo.owner.avatar_url,
					owner_html_url: repo.owner.html_url,
					owner_login: repo.owner.login,
					fetched_at: today,
				};
			});
			return remoteRepos;
		})
		.catch(() => []);
}
function writeToRuns(runsArray, date) {
	fs.writeFileSync('./data/runs.json', JSON.stringify(_.uniq([date, ...runsArray])), 'utf8');
}
function writeToReadme(generatedMd) {
	fs.writeFileSync('./README.md', generatedMd, 'utf8');
}
function writeRepos(reposArray) {
	fs.writeFileSync('./data/repos.json', JSON.stringify(reposArray), 'utf8');
}
function generateTableMd(reposTemplateStr, reposArray) {
	let generatedRepoTemplate = reposTemplateStr;
	reposArray.forEach((repo, i) => {
		// generatedRepoTemplate +=
		// `| ${repo.fetched_at} | [${repo.owner_login}](${repo.owner_html_url})
		// | ${repo.description} | [${repo.full_name}](${repo.html_url})
		// | ${repo.stargazers_count} | ${i + 1} |\n`;
		generatedRepoTemplate += `| ${i + 1} | ${repo.stargazers_count} | [${repo.full_name}](${repo.html_url}) | ${repo.description} | [${repo.owner_login}](${repo.owner_html_url}) | ${repo.fetched_at} |\n`;
	});
	return generatedRepoTemplate;
}

cron.schedule('* * * * *', async () => {
	console.log('runing task every minute');
	const fetchedRepos = await fetchRepos(['devstree'], 'aramrafeq', runs[0]);
	const updatedRepos = _.uniqBy([...fetchedRepos, ...repos], 'html_url');
	const reposMD = generateTableMd(reposTemplate(), updatedRepos);
	// updating readme.md file
	writeToReadme(` ${readmeTemplate()} <div dir='rtl'> \n  ${reposMD}  ${footerTemplate()} </div>`);
	// update repos.json
	writeRepos(updatedRepos);
	//  log latest run for next fetch to fetch latest repostories
	writeToRuns(runs, today);
	// push latest changes to github
	try {
		await git.add(['./data', 'README.md']);
		await git.commit(`Fetched Latest Repositories ${today}`);
		await git.push('origin', 'master');
	} catch (e) {
		console.log(e.toString());
	}
	console.log('Finished...');
});
