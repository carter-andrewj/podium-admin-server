import User from './user';
import Alias from './alias';
import Profile from './profile';
import Domain from './domain';
import Token from './token';
import Post from './post';
import Media from './media';
import KeyStore from './keyStore';

import FollowerIndex from './indexes/followerIndex';
import FollowingIndex from './indexes/followingIndex';
import OwnableIndex from './indexes/ownableIndex';
import TokenIndex from './indexes/tokenIndex';
import PostIndex from './indexes/postIndex';
import ReplyIndex from './indexes/replyIndex';

import Entity from './composables/entity';


function getEntity(type) {
	switch (type.toLowerCase()) {

		case "user": return User
		case "profile": return Profile
		case "domain": return Domain
		case "keystore": return KeyStore
		case "token": return Token
		case "post": return Post
		case "alias": return Alias
		case "media": return Media

		case "followers": return FollowerIndex
		case "following": return FollowingIndex
		case "ownables": return OwnableIndex
		case "posts": return PostIndex
		case "replies": return ReplyIndex
		case "tokens": return TokenIndex

		default: throw new Error(`Unknown Entity Type: ${type}`)

	}
}


export {
	User, Alias, Profile, Domain, Token, Post, Media, KeyStore,
	FollowerIndex, FollowingIndex, OwnableIndex, TokenIndex, PostIndex,
	getEntity
}