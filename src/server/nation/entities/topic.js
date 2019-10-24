import Entity from './composables/entity';
import Moderated from './composables/moderated';
import Reputable from './composables/reputable';
import Followable from './composables/followable';
import Posting from './composables/posting';
import Ownable from './composables/ownable';
import Merged from './composables/merged';


import { requireConnection, requireAuthenticated } from './utils';



export default class Topic extends Entity(
		Moderated,		// Topic is subject to Laws
		Reputable,		// Topic has a reputation
		Followable,		// Topic can be followed
		Posting,		// Topic can create posts
		Ownable,		// Topic is an NFT
		Merged,			// Topic record is a key-value map
	) {

}