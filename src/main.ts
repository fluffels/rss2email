import { docopt } from "docopt"

const doc = `
Usage:
    rss2email add <url>
    rss2email list
    rss2email remove <pk>
    rss2email poll
`;

const add = (url) => {
    console.log(`Adding ${url}`)
};

const list = () => {
    console.log("List");
};

const remove = (pk) => {
    console.log("Remove");
};

const pollAll = () => {
    console.log("Poll");
};

const args = docopt(doc);

if (args.add) {
    add(args['<url>']);
} else if (args.list) {
    list();
} else if (args.remove) {
    remove(args['<pk>']);
} else if (args.poll) {
    pollAll();
}
