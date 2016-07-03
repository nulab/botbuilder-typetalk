export const profile = {
  get: {
    account: {
      id: 1,
      name: 'lemo',
      fullName: 'lemo',
      suggestion: 'lemo',
      imageUrl: 'profile.png',
      createdAt: '2014-02-09T05:11:15Z',
      updatedAt: '2014-03-06T13:35:35Z'
    }
  }
}

export const oauth2 = {
  access_token: {
    access_token: "accesstoken",
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "refreshtoken"
  }
}

export const topic = {
  get: [],
  post: []
}

export const topics = {
  get: {
    topics: [{
      topic: {
        name: 'テストトピック',
        updatedAt: '2014-02-04T12:37:04Z',
        description: null,
        id: 1,
        lastPostedAt: null,
        createdAt: '2014-02-04T10:43:52Z',
        suggestion: 'テストトピック',
      },
      favorite: false,
      unread: {
        topicId: 1706,
        postId: 138451,
        count: 0
      }
    }]
  }
}
