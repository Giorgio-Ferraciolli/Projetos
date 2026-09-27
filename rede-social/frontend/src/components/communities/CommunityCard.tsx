import { Check, UsersRound } from 'lucide-react'
import { Link } from 'react-router'

import type { CommunitySummary } from '../../api/types'
import { pluralize } from '../../lib/format'
import { CommunityCover } from './CommunityCover'
import styles from './CommunityCard.module.css'

export function CommunityCard({ community }: { community: CommunitySummary }) {
  return (
    <Link to={`/communities/${community.id}`} className={styles.card}>
      <CommunityCover name={community.name} url={community.cover_url} className={styles.cover} />
      <div className={styles.body}>
        <h3 className={styles.name}>{community.name}</h3>
        <p className={styles.description}>{community.description}</p>
        <div className={styles.footer}>
          <span className={styles.members}>
            <UsersRound size={16} /> {pluralize(community.members_count, 'membro', 'membros')}
          </span>
          {community.is_member && (
            <span className={styles.badge}>
              <Check size={14} /> Participando
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
