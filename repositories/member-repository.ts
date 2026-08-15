import type { BusinessMember, UserRole } from "@/types/auth";
import { profileRepository } from "./profile-repository";

export class MemberRepository {
  private static mockStore: Map<string, BusinessMember> = new Map();

  static setMock(id: string, member: BusinessMember) {
    this.mockStore.set(id, member);
  }

  static clearMocks() {
    this.mockStore.clear();
  }

  clearMocks() {
    MemberRepository.clearMocks();
  }


  async findById(memberId: string): Promise<BusinessMember | null> {
    const mock = MemberRepository.mockStore.get(memberId);
    if (!mock) return null;
    return this.attachProfile({ ...mock });
  }

  async findByBusinessAndUser(
    businessId: string,
    userId: string,
  ): Promise<BusinessMember | null> {
    for (const member of MemberRepository.mockStore.values()) {
      if (member.businessId === businessId && member.userId === userId) {
        return this.attachProfile({ ...member });
      }
    }
    return null;
  }

  async findByUserId(userId: string): Promise<BusinessMember[]> {
    const results: BusinessMember[] = [];
    for (const member of MemberRepository.mockStore.values()) {
      if (member.userId === userId) {
        results.push(await this.attachProfile({ ...member }));
      }
    }
    return results;
  }

  async findByBusinessId(businessId: string): Promise<BusinessMember[]> {
    const results: BusinessMember[] = [];
    for (const member of MemberRepository.mockStore.values()) {
      if (member.businessId === businessId) {
        results.push(await this.attachProfile({ ...member }));
      }
    }
    return results;
  }

  async create(data: {
    businessId: string;
    userId: string;
    role: UserRole;
  }): Promise<BusinessMember> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const member: BusinessMember = {
      id,
      businessId: data.businessId,
      userId: data.userId,
      role: data.role,
      createdAt: now,
      updatedAt: now,
    };
    MemberRepository.mockStore.set(id, member);
    return this.attachProfile({ ...member });
  }

  async updateRole(memberId: string, role: UserRole): Promise<BusinessMember | null> {
    const existing = MemberRepository.mockStore.get(memberId);
    if (!existing) {
      return null;
    }
    const updated: BusinessMember = {
      ...existing,
      role,
      updatedAt: new Date().toISOString(),
    };
    MemberRepository.mockStore.set(memberId, updated);
    return this.attachProfile({ ...updated });
  }

  async delete(memberId: string): Promise<boolean> {
    return MemberRepository.mockStore.delete(memberId);
  }

  async countOwners(businessId: string): Promise<number> {
    let count = 0;
    for (const member of MemberRepository.mockStore.values()) {
      if (member.businessId === businessId && member.role === "OWNER") {
        count++;
      }
    }
    return count;
  }

  private async attachProfile(member: BusinessMember): Promise<BusinessMember> {
    const profile = await profileRepository.findById(member.userId);
    if (profile) {
      member.profile = {
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName,
      };
    }
    return member;
  }
}

export const memberRepository = new MemberRepository();
