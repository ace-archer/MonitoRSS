import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Types } from "mongoose";
import { FeedLimitReachedException } from "../feeds/exceptions";
import { SupportersService } from "../supporters/supporters.service";
import { UserFeed, UserFeedModel } from "../user-feeds/entities";
import { UserFeedsService } from "../user-feeds/user-feeds.service";
import { UserFeedManagerStatus } from "./constants";
import { UserManagerAlreadyInvitedException } from "./exceptions";

@Injectable()
export class UserFeedManagementInvitesService {
  constructor(
    @InjectModel(UserFeed.name) private readonly userFeedModel: UserFeedModel,
    private readonly userFeedsService: UserFeedsService,
    private readonly supportersService: SupportersService
  ) {}

  async createInvite({
    feed,
    targetDiscordUserId,
  }: {
    feed: UserFeed;
    targetDiscordUserId: string;
  }) {
    if (!feed.shareManageOptions) {
      feed.shareManageOptions = {
        users: [],
      };
    }

    if (!feed.shareManageOptions.users) {
      feed.shareManageOptions.users = [];
    }

    if (
      feed.shareManageOptions.users.find(
        (u) => u.discordUserId === targetDiscordUserId
      )
    ) {
      throw new UserManagerAlreadyInvitedException("User already invited");
    }

    if (targetDiscordUserId === feed.user.discordUserId) {
      throw new UserManagerAlreadyInvitedException("Cannot invite self");
    }

    feed.shareManageOptions.users.push({
      discordUserId: targetDiscordUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: UserFeedManagerStatus.Pending,
      id: new Types.ObjectId(),
    });

    await this.userFeedModel.updateOne(
      {
        _id: feed._id,
      },
      {
        $set: {
          shareManageOptions: feed.shareManageOptions,
        },
      }
    );
  }

  async getUserFeedOfInviteWithOwner(
    inviteId: string,
    ownerDiscordUserId: string
  ) {
    return this.userFeedModel
      .findOne({
        "user.discordUserId": ownerDiscordUserId,
        "shareManageOptions.users.id": new Types.ObjectId(inviteId),
      })
      .lean();
  }

  async getUserFeedOfInviteWithInvitee(
    inviteId: string,
    inviteeDiscordUserId: string
  ) {
    return this.userFeedModel
      .findOne({
        "shareManageOptions.users": {
          $elemMatch: {
            id: new Types.ObjectId(inviteId),
            discordUserId: inviteeDiscordUserId,
          },
        },
      })
      .lean();
  }

  async deleteInvite(userFeedId: Types.ObjectId, id: string) {
    await this.userFeedModel.updateOne(
      {
        _id: userFeedId,
      },
      {
        $pull: {
          "shareManageOptions.users": {
            id: new Types.ObjectId(id),
          },
        },
      }
    );
  }

  async resendInvite(userFeedId: Types.ObjectId, id: string) {
    const found = await this.userFeedModel
      .findOneAndUpdate(
        {
          _id: userFeedId,
          "shareManageOptions.users.id": new Types.ObjectId(id),
        },
        {
          $set: {
            "shareManageOptions.users.$.status": UserFeedManagerStatus.Pending,
          },
        }
      )
      .select("_id")
      .lean();

    if (!found) {
      throw new NotFoundException(
        `Failed to resend invite ${id} for user feed ${userFeedId}: invite ID is not in user feed`
      );
    }
  }

  async updateInvite(
    userFeed: UserFeed,
    inviteId: string,
    inviteeDiscordUserId: string,
    updates: {
      status?: UserFeedManagerStatus;
    }
  ) {
    const inviteIndex = userFeed?.shareManageOptions?.users?.findIndex(
      (u) => u.id.toHexString() === inviteId
    );

    if (inviteIndex === -1) {
      throw new Error(
        `Failed to update invite ${inviteId} for user feed ${userFeed._id}: invite ID is not in user feed`
      );
    }

    const { maxUserFeeds } =
      await this.supportersService.getBenefitsOfDiscordUser(
        inviteeDiscordUserId
      );

    const currentCount =
      await this.userFeedsService.calculateCurrentFeedCountOfDiscordUser(
        inviteeDiscordUserId
      );

    if (
      updates.status === UserFeedManagerStatus.Accepted &&
      currentCount >= maxUserFeeds
    ) {
      throw new FeedLimitReachedException("Max feeds reached");
    }

    await this.userFeedModel.updateOne(
      {
        _id: userFeed._id,
      },
      {
        $set: {
          ...(updates.status && {
            [`shareManageOptions.users.${inviteIndex}.status`]: updates.status,
          }),
        },
      }
    );
  }

  async getMyPendingInvites(discordUserId: string): Promise<
    Array<{
      id: string;
      feed: Pick<UserFeed, "title" | "url"> & {
        id: string;
        ownerDiscordUserId: string;
      };
    }>
  > {
    const feeds = await this.userFeedModel
      .find({
        "shareManageOptions.users": {
          $elemMatch: {
            discordUserId,
            status: UserFeedManagerStatus.Pending,
          },
        },
      })
      .select("_id title url user shareManageOptions")
      .lean();

    return feeds.map((feed) => ({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      id: feed
        .shareManageOptions!.users.find(
          (u) => u.discordUserId === discordUserId
        )!
        .id.toHexString(),
      feed: {
        id: feed._id.toHexString(),
        title: feed.title,
        url: feed.url,
        ownerDiscordUserId: feed.user.discordUserId,
      },
    }));
  }

  async getMyPendingInviteCount(discordUserId: string): Promise<number> {
    const count = await this.userFeedModel.countDocuments({
      "shareManageOptions.users": {
        $elemMatch: {
          discordUserId,
          status: UserFeedManagerStatus.Pending,
        },
      },
    });

    return count;
  }
}