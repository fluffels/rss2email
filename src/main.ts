import "reflect-metadata"
import { docopt } from "docopt"
import {createConnection, Entity, PrimaryGeneratedColumn, Column, Connection} from "typeorm"

const crypto = require("crypto");
const htmlparser2 = require("htmlparser2");
const mail = require("@sendgrid/mail");
const superagent = require("superagent");

mail.setApiKey(process.env.SENDGRID_API_KEY);

@Entity()
class Feed {
    @PrimaryGeneratedColumn()
    pk: number;
    @Column()
    url: string;
}

@Entity()
class HashEntry {
    @PrimaryGeneratedColumn()
    pk: number;
    @Column()
    hash: string;
}

class Item {
    description: string;
    link: string;
    title: string;

    constructor() {
        this.description = "";
        this.link = "";
        this.title = "";
    }
}

const getConnection = async () => {
    return await createConnection({
        type: "sqlite",
        database: "db/db.sqlite",
        entities: [
            Feed,
            HashEntry
        ],
        synchronize: true
    });
};

const doc = `
Usage:
    rss2email add <url>
    rss2email list
    rss2email remove <pk>
    rss2email poll
`;

const add = async (url) => {
    const feed = new Feed();
    feed.url = url;
    const conn = await getConnection();
    await conn.manager.save(feed);
};

const list = async () => {
    const conn = await getConnection();
    let feeds = await conn.manager.find(Feed);
    console.log(feeds);
};

const remove = async (pk) => {
    const conn = await getConnection();
    let feed = await conn.manager.find(Feed, { pk });
    await conn.manager.remove(Feed, feed);
};

const poll = async (conn: Connection, feed: Feed) => {
    const items: Item[] = [];
    try {
        const res = await superagent.get(feed.url);
        let currentItem: Item;
        let currentTag = "";
        const parser = new htmlparser2.Parser({
            onopentag(name: string, _: any): void {
                currentTag = name;
                if (name === "item") {
                    currentItem = new Item;
                }
            },
            onclosetag(name: string): void {
                if (name === "item") {
                    items.push(currentItem);
                }
            },
            ontext(data: string): void {
                if (!currentItem) {
                    return;
                } else if (currentTag === 'title') {
                    currentItem.title += data;
                } else if (currentTag === 'link') {
                    currentItem.link += data;
                } else if (currentTag === 'description') {
                    currentItem.description += data;
                }
            },
        }, {
            xmlMode: true
        });
        parser.write(res.text);
        parser.end();
    } catch(err) {
        console.error(err);
    }

    for (const item of items) {
        const key = item.title + item.link + item.description;
        const hash = crypto.createHash("sha256").update(key).digest("base64");

        const count = await conn.manager.count(HashEntry, { hash });
        if (count == 0) {
            const hashEntry = new HashEntry;
            hashEntry.hash = hash;
            await conn.manager.save(hashEntry);
            console.log(`sending ${hash}`);

            const msg = {
                to: 'jcwkroeze@pm.me',
                from: 'jan@kroeze.io',
                subject: '[rss2email] ' + item.title,
                html: `
                    <div>
                        <h1>
                            <a href='${item.link}'>${item.title}</a>
                        </h1>
                        <p>
                        ${item.description}
                        </p>
                    </div>
                `
            };
            await mail.send(msg);
        } else {
            console.log(`skipping ${hash}`);
        }
    }
};

const pollAll = async () => {
    const conn = await getConnection();
    let feeds = await conn.manager.find(Feed);
    let promises = feeds.map((f) => poll(conn, f));
    return Promise.all(promises);
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
