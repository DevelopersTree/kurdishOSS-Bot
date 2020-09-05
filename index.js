const superagent = require('superagent');

const url = `https://api.github.com/search/repositories`;
const params = {
    q: `topic:devstree+is:public+archived:false+created:%3E2018-11-01`,
    sort: 'stars',
    order: 'desc'
}
const appName = 'aramrafeq';
superagent
    .get(url)
    .query(params)
    .set('User-Agent', appName)
    .end((err, res)=>{
        if(!err){
            console.log(res.body)
        } else{
            console.log(err)
        }
    });